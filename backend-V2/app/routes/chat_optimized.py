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
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from app.core.security import get_current_user
from app.services.ai_service import get_ai_service
from app.services.analytics_chat.analytic_chat_service import AnalyticChatService
from app.services.chat_workflow import get_langgraph_rag_service
from app.db.connections import get_neo4j_driver, get_postgres_session

router = APIRouter(prefix="/chat-optimized", tags=["Chat"])

logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    question: str
    folder_id: Optional[str] = None
    session_id: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = []
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
        yield json.dumps({"type": "step", "id": 1, "status": "Analyzing research intent..."}) + "\n"

        scope = None
        if folder_id:
            scope = {"type": "folder", "id": folder_id}
        elif file_id:
            scope = {"type": "file", "id": file_id}

        initial_state = {
            "question": question,
            "session_id": session_id or "anonymous",
            "history": history or [],
            "scope": scope,
            "query_type": "simple_lookup",
            "requires_scout": False,
            "vector_results": [],
            "graph_context": "",
            "backbone_relations": "",
            "answer": "",
            "citations": [],
            "related_nodes": [],
            "error": None
        }
        t_start = time.time()

        try:
            from app.services.chat_workflow import router_node, retriever_node, enricher_node
            
            router_res = await router_node(initial_state)
            initial_state.update(router_res)
            
            yield json.dumps({
                "type": "intent",
                "data": {
                    "query_type": initial_state["query_type"],
                    "requires_scout": initial_state["requires_scout"]
                }
            }) + "\n"

            # --- Fix 6: Run GDS algorithms for structural/aggregate queries ---
            gds_algorithm = None
            gds_results_data = []
            query_type = initial_state["query_type"]
            
            if query_type in ("structural", "aggregate") and folder_id:
                try:
                    analytics_svc = AnalyticChatService()
                    gds_result = await analytics_svc.process_query(
                        query=question, folder_id=folder_id, node_ids=None
                    )
                    gds_algorithm = gds_result.get("algorithm")
                    gds_results_data = gds_result.get("results", [])
                    logger.info(f"[Stream] GDS algorithm '{gds_algorithm}' returned {len(gds_results_data)} results")
                except Exception as gds_err:
                    logger.warning(f"[Stream] GDS integration skipped: {gds_err}")
            
            yield json.dumps({
                "type": "gds_results",
                "data": {"algorithm": gds_algorithm, "results": gds_results_data[:20]}
            }) + "\n"

            web_result = None
            if web_search:
                web_result = await run_simulated_web_search(question)
                yield json.dumps({
                    "type": "web_search_result",
                    "data": {
                        "answer": web_result.get("answer", ""),
                        "sources": web_result.get("sources", [])
                    }
                }) + "\n"

            retriever_res = await retriever_node(initial_state)
            initial_state.update(retriever_res)
            
            enricher_res = await enricher_node(initial_state)
            initial_state.update(enricher_res)

            vector_results = initial_state.get("vector_results", [])
            is_grounded = len(vector_results) > 0
            grounding_score = 0.9 if is_grounded else 0.0
            suggest_web_search = not is_grounded if not web_search else False
            thin_context = not is_grounded

            yield json.dumps({
                "type": "web_search_suggestion",
                "data": suggest_web_search,
                "emphasized": thin_context
            }) + "\n"

            yield json.dumps({
                "type": "data_grounding",
                "data": {
                    "grounded": is_grounded,
                    "score": grounding_score,
                    "source_count": len(vector_results),
                    "context_chars": len(initial_state.get("graph_context", "")),
                    "algorithm": None
                }
            }) + "\n"

            graph_context = initial_state.get("graph_context", "")
            backbone = initial_state.get("backbone_relations", "")
            
            from app.core.prompts import get_hybrid_rag_system_prompt
            ai = get_ai_service()
            full_answer = ""

            # Build conversation history as LangChain messages (last 10 turns)
            history_messages = []
            for h in (history or [])[-10:]:
                role = h.get("role", "user")
                content = h.get("content", "")
                if not content:
                    continue
                if role == "user":
                    history_messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    history_messages.append(AIMessage(content=content))
            
            if not graph_context.strip():
                if web_result and web_result.get("answer"):
                    web_ans = web_result.get("answer")
                    sys_msg = SystemMessage(content=(
                        "You are a helpful assistant. The user's query could not be answered "
                        "using the local database, but web search returned some information. "
                        "Synthesize a clear, helpful response and note it is from the web."
                    ))
                    lc_messages = [sys_msg] + history_messages + [
                        HumanMessage(content=f"Web search context:\n{web_ans}\n\nQuestion: {question}")
                    ]
                    async for chunk in ai.llm.astream(lc_messages):
                        content = chunk.content if hasattr(chunk, "content") else str(chunk)
                        if content:
                            yield json.dumps({"type": "content", "data": content}) + "\n"
                            full_answer += content
                else:
                    ans_chunk = "I couldn't find relevant information in your knowledge base for this question. You can try enabling web search, or upload documents related to this topic."
                    yield json.dumps({"type": "content", "data": ans_chunk}) + "\n"
                    full_answer = ans_chunk
            else:
                # System prompt already contains graph_context — don't duplicate it
                system_prompt = get_hybrid_rag_system_prompt(graph_context=graph_context, backbone=backbone)
                lc_messages = [SystemMessage(content=system_prompt)] + history_messages + [
                    HumanMessage(content=question)
                ]
                
                async for chunk in ai.llm.astream(lc_messages):
                    content = chunk.content if hasattr(chunk, "content") else str(chunk)
                    if content:
                        yield json.dumps({"type": "content", "data": content}) + "\n"
                        full_answer += content

            # --- Save chat history BEFORE yielding done (prevents lost saves on connection close) ---
            citations_metadata = {
                "algorithm": gds_algorithm,
                "folder_id": folder_id,
                "gds_results": gds_results_data[:5] if gds_results_data else [],
                "grounding": {
                    "score": grounding_score,
                    "is_grounded": is_grounded,
                    "source_count": len(vector_results)
                }
            }
            if web_result:
                citations_metadata["web_search_attachment"] = {
                    "answer": web_result.get("answer", ""),
                    "sources": web_result.get("sources", [])
                }
            
            db_session_id = session_id or str(uuid.uuid4())
            try:
                db_session_id = str(uuid.UUID(db_session_id))
            except (ValueError, TypeError):
                db_session_id = str(uuid.uuid5(uuid.NAMESPACE_OID, db_session_id))
            
            try:
                async with get_postgres_session() as pg_session:
                    # Save user message
                    await pg_session.execute(
                        sa_text("""
                            INSERT INTO neural_nexus.chat_history (user_id, session_id, role, message, citations)
                            VALUES (:user_id, :session_id, 'user', :message, NULL)
                        """),
                        {"user_id": user_id, "session_id": db_session_id, "message": question}
                    )
                    # Save assistant message
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
                    logger.info(f"[Stream] Batched save: user+assistant in session {db_session_id}")
            except Exception as save_err:
                logger.warning(f"[Stream] Failed to batch-save chat history: {save_err}")

            elapsed_total = (time.time() - t_start) * 1000
            logger.info(f"[Stream] Total stream_answer completed in {elapsed_total:.0f}ms")

            yield json.dumps({"type": "done"}) + "\n"

        except Exception as e:
            logger.error(f"Error in legacy CombinedRAGService stream compatibility: {e}", exc_info=True)
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
        f"in their knowledge graph database. They have now requested a general knowledge answer.\n\n"
        f"Question: {request.question}\n\n"
        f"Provide a helpful, accurate answer based on your general training knowledge. "
        f"Start your response with: '⚠️ **General Knowledge Answer** (not from your database):\\n\\n' "
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

# Dead endpoints removed:
# - /query and /query-stream (frontend uses /stream-answer)
# - /analytics-query (GDS analytics integrated into /stream-answer)
# - /health (redundant with /api/v1/health)
# - combined_router (duplicate of chat-optimized)