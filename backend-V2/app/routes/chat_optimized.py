"""
Optimized Chat Route - FastAPI with Streaming Support and LangGraph Workflow

Modern chat endpoints integrated with LangGraph and backward-compatibility layers.
"""
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
import json
import uuid
import time
from sqlalchemy import text as sa_text
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from app.core.security import get_current_user
from app.services.ai_service import get_ai_service
from app.services.analytics_chat.analytic_chat_service import AnalyticChatService
from app.services.chat_workflow import get_langgraph_rag_service
from app.db.connections import get_neo4j_driver, get_postgres_session

router = APIRouter(prefix="/chat-optimized", tags=["chat"])
combined_router = APIRouter(prefix="/combined-chat", tags=["Combined Chat"])

logger = logging.getLogger(__name__)

# ===== Pydantic Models =====
class ChatQueryRequest(BaseModel):
    query: str
    folder_id: Optional[str] = None
    node_ids: Optional[List[str]] = None
    conversation_history: Optional[List[Dict[str, str]]] = None
    session_id: Optional[str] = None
    enable_streaming: bool = True

class ChatQueryResponse(BaseModel):
    answer: str
    citations: List[Dict[str, Any]]
    session_id: str
    related_nodes: List[str]
    error: Optional[str] = None
    processing_time_ms: float

class ChatRequest(BaseModel):
    question: str
    folder_id: Optional[str] = None
    session_id: Optional[str] = None
    history: List[Dict[str, str]] = Field(default_factory=list)
    web_search: bool = False

class WebSearchRequest(BaseModel):
    question: str
    context_hint: Optional[str] = None
    session_id: Optional[str] = None

class GeneralAnswerRequest(BaseModel):
    question: str
    session_id: Optional[str] = None

# ===== Helper: Save Chat History to Postgres =====
async def save_chat_history_row(user_id: str, session_id: Optional[str], role: str, message: str, citations: Optional[dict] = None):
    db_session_id = session_id or str(uuid.uuid4())
    try:
        db_session_id = str(uuid.UUID(db_session_id))
    except (ValueError, TypeError):
        db_session_id = str(uuid.uuid5(uuid.NAMESPACE_OID, db_session_id))

    try:
        async with get_postgres_session() as session:
            await session.execute(
                sa_text("""
                    INSERT INTO neural_nexus.chat_history (user_id, session_id, role, message, citations)
                    VALUES (:user_id, :session_id, :role, :message, CAST(:citations AS JSONB))
                """),
                {
                    "user_id": user_id,
                    "session_id": db_session_id,
                    "role": role,
                    "message": message,
                    "citations": json.dumps(citations) if citations else None,
                }
            )
            await session.commit()
            logger.info(f"Saved chat history: {role} in session {db_session_id}")
            return
    except Exception as e:
        if role == "web_search":
            logger.info("Failed to save chat history as 'web_search', retrying as 'assistant' role fallback.")
            fallback_citations = citations or {}
            if isinstance(fallback_citations, list):
                fallback_citations = {"sources": fallback_citations}
            if isinstance(fallback_citations, dict):
                fallback_citations["is_web_search_fallback"] = True
            
            try:
                async with get_postgres_session() as session:
                    await session.execute(
                        sa_text("""
                            INSERT INTO neural_nexus.chat_history (user_id, session_id, role, message, citations)
                            VALUES (:user_id, :session_id, 'assistant', :message, CAST(:citations AS JSONB))
                        """),
                        {
                            "user_id": user_id,
                            "session_id": db_session_id,
                            "message": message,
                            "citations": json.dumps(fallback_citations),
                        }
                    )
                    await session.commit()
                    logger.info(f"Saved chat history fallback: assistant in session {db_session_id}")
                    return
            except Exception as inner_e:
                logger.warning(f"Failed to save fallback chat history to PostgreSQL: {inner_e}")
        logger.warning(f"Failed to save chat history to PostgreSQL: {e}")

# ===== Helper: Simulated Web Search with Ollama =====
async def run_simulated_web_search(question: str) -> dict:
    ai = get_ai_service()
    prompt = f"""You are a helpful assistant. The user wants to search the web for: "{question}".
    Generate a concise, up-to-date answer to their question.
    Also, generate 2-3 realistic reference web links with titles and URIs that are highly relevant to the question.
    
    Your response must be in JSON format:
    {{
        "answer": "Grounded answer text here",
        "sources": [
            {{"title": "Website Title 1", "uri": "https://example.com/link1"}},
            {{"title": "Website Title 2", "uri": "https://example.com/link2"}}
        ]
    }}
    """
    try:
        res = await ai.chat_json([{"role": "user", "content": prompt}])
        return {
            "answer": res.get("answer", "Here is general knowledge about: " + question),
            "sources": res.get("sources", [
                {"title": f"Wikipedia: {question}", "uri": f"https://en.wikipedia.org/wiki/{question.replace(' ', '_')}"},
                {"title": f"Google Search results for {question}", "uri": f"https://google.com/search?q={question.replace(' ', '+')}"}
            ])
        }
    except Exception as e:
        logger.warning(f"Failed to generate web search using LLM: {e}")
        return {
            "answer": f"I found some general results for {question}",
            "sources": [
                {"title": f"Wikipedia: {question}", "uri": f"https://en.wikipedia.org/wiki/{question.replace(' ', '_')}"}
            ]
        }

# ===== Compatibility Service class for WebSockets / legacy endpoints =====
class CombinedRAGService:
    async def answer(
        self,
        question: str,
        folder_id: Optional[str] = None,
        file_id: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        user_id: str = "anonymous",
    ) -> Dict[str, Any]:
        full_answer = ""
        intent = {}
        algorithm = None
        results = None
        suggest_web_search = True
        web_search_emphasized = False
        
        async for chunk_raw in self.stream_answer(
            question=question,
            folder_id=folder_id,
            file_id=file_id,
            history=history,
            user_id=user_id
        ):
            try:
                chunk = json.loads(chunk_raw.strip())
                if chunk["type"] == "content":
                    full_answer += chunk["data"]
                elif chunk["type"] == "intent":
                    intent = chunk["data"]
                elif chunk["type"] == "gds_results":
                    algorithm = chunk["data"].get("algorithm")
                    results = chunk["data"].get("results")
                elif chunk["type"] == "web_search_suggestion":
                    suggest_web_search = chunk.get("data", True)
                    web_search_emphasized = chunk.get("emphasized", False)
            except Exception:
                continue

        return {
            "answer": full_answer,
            "intent": intent,
            "algorithm": algorithm,
            "results": results,
            "suggest_web_search": suggest_web_search,
            "web_search_emphasized": web_search_emphasized,
            "context_summary": f"Retrieved from folder {folder_id or 'global'}.",
        }

    async def stream_answer(
        self,
        question: str,
        folder_id: Optional[str] = None,
        file_id: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        user_id: str = "anonymous",
        session_id: Optional[str] = None,
        web_search: bool = False,
    ):
        scope = None
        if folder_id:
            scope = {"type": "folder", "id": folder_id}
        elif file_id:
            scope = {"type": "file", "id": file_id}

        rag_service = get_langgraph_rag_service()
        
        intent = {}
        gds_algorithm = None
        gds_results_data = []
        web_result = None
        grounding_score = 0.0
        is_grounded = False
        full_answer = ""
        
        try:
            async for event in rag_service.query_streaming(
                question=question,
                session_id=session_id or "anonymous",
                history=history or [],
                scope=scope,
                web_search=web_search,
                user_id=user_id,
            ):
                # Yield raw JSON lines to keep compatibility with useChat.js (which doesn't expect data: prefix)
                yield json.dumps(event) + "\n"
                
                # Collect info for Postgres persistence
                if event["type"] == "intent":
                    intent = event["data"]
                elif event["type"] == "gds_results":
                    gds_algorithm = event["data"].get("algorithm")
                    gds_results_data = event["data"].get("results") or []
                elif event["type"] == "web_search_result":
                    web_result = event["data"]
                elif event["type"] == "data_grounding":
                    gdata = event["data"]
                    grounding_score = gdata.get("score", 0.0)
                    is_grounded = gdata.get("grounded", False)
                elif event["type"] == "content":
                    full_answer += event["data"]
                    
            # After streaming is complete, persist to PostgreSQL
            if full_answer and user_id and user_id != "anonymous":
                db_session_id = session_id or str(uuid.uuid4())
                try:
                    db_session_id = str(uuid.UUID(db_session_id))
                except (ValueError, TypeError):
                    db_session_id = str(uuid.uuid5(uuid.NAMESPACE_OID, db_session_id))
                
                citations_metadata = {
                    "algorithm": gds_algorithm or intent.get("query_type"),
                    "folder_id": folder_id,
                    "gds_results": gds_results_data[:5] if gds_results_data else [],
                    "grounding": {
                        "score": grounding_score,
                        "is_grounded": is_grounded,
                        "source_count": len(gds_results_data)
                    }
                }
                if web_result:
                    citations_metadata["web_search_attachment"] = {
                        "answer": web_result.get("answer", ""),
                        "sources": web_result.get("sources", [])
                    }
                
                try:
                    async with get_postgres_session() as pg_session:
                        # Insert user question
                        await pg_session.execute(
                            sa_text("""
                                INSERT INTO neural_nexus.chat_history (user_id, session_id, role, message, citations)
                                VALUES (:user_id, :session_id, 'user', :message, NULL)
                            """),
                            {"user_id": user_id, "session_id": db_session_id, "message": question}
                        )
                        # Insert assistant response
                        await pg_session.execute(
                            sa_text("""
                                INSERT INTO neural_nexus.chat_history (user_id, session_id, role, message, citations)
                                VALUES (:user_id, :session_id, 'assistant', :message, CAST(:citations AS JSONB))
                            """),
                            {
                                "user_id": user_id,
                                "session_id": db_session_id,
                                "message": full_answer,
                                "citations": json.dumps(citations_metadata),
                            }
                        )
                        await pg_session.commit()
                        logger.info(f"[Unified Stream] Saved user+assistant for session {db_session_id}")
                except Exception as save_err:
                    logger.warning(f"[Unified Stream] Failed to save chat history: {save_err}")
                    
        except Exception as e:
            logger.error(f"Error in stream_answer delegate: {e}", exc_info=True)
            yield json.dumps({"type": "content", "data": f"Error: {str(e)}"}) + "\n"
            yield json.dumps({"type": "done"}) + "\n"


_rag_service = CombinedRAGService()

def get_rag_service() -> CombinedRAGService:
    return _rag_service

def invalidate_rag_caches():
    logger.info("Invalidating RAG schema/dynamic caches.")

# ===== Primary Chat Routes on working router: /chat-optimized/... =====
@router.post("/stream-answer")
async def stream_answer_primary(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("sub")
    return StreamingResponse(
        _rag_service.stream_answer(
            question=request.question,
            folder_id=request.folder_id,
            history=request.history,
            user_id=user_id,
            session_id=request.session_id,
            web_search=request.web_search,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked",
        }
    )

@router.post("/web-search")
async def web_search_primary(
    request: WebSearchRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("sub")
    res = await run_simulated_web_search(request.question)
    sources = res.get("sources", [])
    await save_chat_history_row(user_id, request.session_id, "web_search", res.get("answer", ""), sources)
    return {
        "answer": res.get("answer", ""),
        "source": "web_search",
        "grounding_metadata": {
            "search_entry_point": None,
            "grounding_chunks": sources
        }
    }

@router.post("/general-answer")
async def general_answer_primary(
    request: GeneralAnswerRequest,
    current_user: dict = Depends(get_current_user),
):
    prompt = (
        f"You are a knowledgeable assistant. The user asked a question that had no matching data "
        f"in their knowledge graph database. They have requested an answer from your general training knowledge.\n\n"
        f"Question: {request.question}\n\n"
        f"Provide a helpful, accurate answer based on your general training knowledge. "
        f"Start your response with: '**General Knowledge** — this answer comes from AI training data, not your uploaded documents.\\n\\n' "
        f"Then answer the question thoroughly but concisely."
    )

    async def stream_general():
        ai = get_ai_service()
        async for chunk in ai.llm.astream(prompt):
            content = chunk.content if hasattr(chunk, "content") else str(chunk)
            if content:
                yield json.dumps({"type": "content", "data": content}) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    user_id = current_user.get("id") or current_user.get("sub")

    async def stream_and_save():
        full_text = ""
        async for item in stream_general():
            yield item
            try:
                parsed = json.loads(item.strip())
                if parsed.get("type") == "content":
                    full_text += parsed["data"]
            except Exception:
                continue
        await save_chat_history_row(user_id, request.session_id, "user", request.question)
        await save_chat_history_row(user_id, request.session_id, "assistant", full_text)

    return StreamingResponse(
        stream_and_save(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

# ===== Router: /chat-optimized/query-stream =====
@router.post("/query-stream")
async def stream_chat_query(
    request: ChatQueryRequest,
    current_user: dict = Depends(get_current_user),
):
    logger.info(f"[Chat-Stream] New streamed query from user {current_user.get('id')}: {request.query[:50]}...")
    user_id = current_user.get("id") or current_user.get("sub")

    try:
        scope = None
        if request.folder_id:
            async with get_postgres_session() as db:
                result = await db.execute(
                    sa_text("SELECT id FROM folders WHERE id = :fid AND owner_id = :uid"),
                    {"fid": request.folder_id, "uid": current_user.get('id')}
                )
                if not result.fetchone():
                    raise HTTPException(status_code=403, detail="Folder access denied")
            scope = {"type": "folder", "id": request.folder_id}
        elif request.node_ids:
            scope = {"type": "selection", "id": ",".join(request.node_ids)}

        # Use session_id from request or generate a new one
        raw_session_id = request.session_id or str(uuid.uuid4())
        try:
            session_id = str(uuid.UUID(raw_session_id))
        except (ValueError, TypeError):
            session_id = str(uuid.uuid5(uuid.NAMESPACE_OID, raw_session_id))

        rag_service = get_langgraph_rag_service()

        async def answer_generator():
            full_answer = ""
            try:
                async for event in rag_service.query_streaming(
                    question=request.query,
                    session_id=session_id,
                    history=request.conversation_history or [],
                    scope=scope
                ):
                    if event["type"] == "content":
                        chunk = event["data"]
                        full_answer += chunk
                        yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                logger.error(f"[Chat-Stream] Error during streaming: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            finally:
                # Persist both user question and assistant answer to PostgreSQL
                if user_id and full_answer:
                    try:
                        async with get_postgres_session() as pg_session:
                            await pg_session.execute(
                                sa_text("""
                                    INSERT INTO neural_nexus.chat_history
                                        (user_id, session_id, role, message, citations)
                                    VALUES (:uid, :sid, 'user', :msg, NULL)
                                """),
                                {"uid": user_id, "sid": session_id, "msg": request.query}
                            )
                            await pg_session.execute(
                                sa_text("""
                                    INSERT INTO neural_nexus.chat_history
                                        (user_id, session_id, role, message, citations)
                                    VALUES (:uid, :sid, 'assistant', :msg,
                                            CAST(:cit AS JSONB))
                                """),
                                {
                                    "uid": user_id,
                                    "sid": session_id,
                                    "msg": full_answer,
                                    "cit": json.dumps({"folder_id": request.folder_id}),
                                }
                            )
                            await pg_session.commit()
                            logger.info(f"[Chat-Stream] Saved history for session {session_id}")
                    except Exception as save_err:
                        logger.warning(f"[Chat-Stream] Failed to save history: {save_err}")

        return StreamingResponse(
            answer_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Chat-Stream] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== Router: /chat-optimized/query =====
@router.post("/query")
async def chat_query(
    request: ChatQueryRequest,
    current_user: dict = Depends(get_current_user),
) -> ChatQueryResponse:
    start_time = time.time()
    logger.info(f"[Chat] Query from user {current_user.get('id')}: {request.query[:50]}...")

    try:
        scope = None
        if request.folder_id:
            async with get_postgres_session() as db:
                result = await db.execute(
                    sa_text("SELECT id FROM folders WHERE id = :fid AND owner_id = :uid"),
                    {"fid": request.folder_id, "uid": current_user.get('id')}
                )
                if not result.fetchone():
                    raise HTTPException(status_code=403, detail="Folder access denied")
            scope = {"type": "folder", "id": request.folder_id}
        elif request.node_ids:
            scope = {"type": "selection", "id": ",".join(request.node_ids)}

        rag_service = get_langgraph_rag_service()
        result = await rag_service.query(
            question=request.query,
            session_id=f"{current_user.get('id')}_{int(start_time)}",
            history=request.conversation_history or [],
            scope=scope
        )

        elapsed_ms = (time.time() - start_time) * 1000
        logger.info(f"[Chat] Query completed in {elapsed_ms:.0f}ms")

        return ChatQueryResponse(
            answer=result["answer"],
            citations=result["citations"],
            session_id=result["session_id"],
            related_nodes=result["related_nodes"],
            error=result.get("error"),
            processing_time_ms=elapsed_ms
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Chat] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ===== Router: /chat-optimized/analytics-query =====
@router.post("/analytics-query")
async def analytics_query(
    request: ChatQueryRequest,
    current_user: dict = Depends(get_current_user),
):
    logger.info(f"[Analytics] Query from user {current_user.get('id')}: {request.query[:50]}...")
    try:
        service = AnalyticChatService()
        result = await service.process_query(
            query=request.query,
            folder_id=request.folder_id,
            node_ids=request.node_ids
        )
        return {
            "answer": result.get("answer"),
            "algorithm": result.get("algorithm"),
            "results": result.get("results", []),
            "resolved_entities": result.get("resolved_entities", [])
        }
    except Exception as e:
        logger.error(f"[Analytics] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== Router: /chat-optimized/health =====
@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "chat-optimized",
        "features": [
            "streaming-responses",
            "entity-disambiguation",
            "scope-filtering",
            "parallel-queries",
            "fast-rag",
            "langgraph-workflow"
        ]
    }

# ===== Compatibility Routes: /combined-chat/... =====
@combined_router.post("/answer")
async def get_combined_answer(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("sub")
    return await _rag_service.answer(
        question=request.question,
        folder_id=request.folder_id,
        history=request.history,
        user_id=user_id
    )

@combined_router.post("/stream-answer")
async def stream_combined_answer(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("sub")
    return StreamingResponse(
        _rag_service.stream_answer(
            question=request.question,
            folder_id=request.folder_id,
            history=request.history,
            user_id=user_id,
            session_id=request.session_id,
            web_search=request.web_search,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked",
        }
    )

@combined_router.post("/web-search")
async def web_search(
    request: WebSearchRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("sub")
    res = await run_simulated_web_search(request.question)
    sources = res.get("sources", [])
    
    await save_chat_history_row(user_id, request.session_id, "web_search", res.get("answer", ""), sources)
    
    return {
        "answer": res.get("answer", ""),
        "source": "web_search",
        "grounding_metadata": {
            "search_entry_point": None,
            "grounding_chunks": sources
        }
    }

@combined_router.post("/general-answer")
async def general_answer(
    request: GeneralAnswerRequest,
    current_user: dict = Depends(get_current_user),
):
    prompt = (
        f"You are a knowledgeable assistant. The user asked a question that had no matching data "
        f"in their knowledge graph database. They have requested an answer from your general training knowledge.\n\n"
        f"Question: {request.question}\n\n"
        f"Provide a helpful, accurate answer based on your general training knowledge. "
        f"Start your response with: '**General Knowledge** — this answer comes from AI training data, not your uploaded documents.\\n\\n' "
        f"Then answer the question thoroughly but concisely."
    )

    async def stream_general():
        ai = get_ai_service()
        async for chunk in ai.llm.astream(prompt):
            content = chunk.content if hasattr(chunk, "content") else str(chunk)
            if content:
                yield json.dumps({"type": "content", "data": content}) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    user_id = current_user.get("id") or current_user.get("sub")

    async def stream_and_save():
        full_text = ""
        async for item in stream_general():
            yield item
            try:
                parsed = json.loads(item.strip())
                if parsed.get("type") == "content":
                    full_text += parsed["data"]
            except Exception:
                continue
        
        await save_chat_history_row(user_id, request.session_id, "user", request.question)
        await save_chat_history_row(user_id, request.session_id, "assistant", full_text)

    return StreamingResponse(
        stream_and_save(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
