"""
LangGraph Chat & RAG Workflow

Orchestrates the chat process as a stateful graph using LangGraph:
1. Router Node: Classifies the query type.
2. Retriever Node: Performs parallel vector + lexical search.
3. Enricher Node: Expands the graph context.
4. Synthesizer Node: Combines context and synthesizes the answer.
"""
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, TypedDict, Tuple, AsyncGenerator
from langgraph.graph import StateGraph, END

from app.core.config import settings
from app.core.prompts import get_hybrid_rag_system_prompt
from app.services.ai_service import get_ai_service
from app.db.connections import get_neo4j_driver

logger = logging.getLogger(__name__)

# ===== LangGraph State Definition =====
class ChatState(TypedDict):
    question: str
    session_id: str
    history: List[Dict[str, str]]
    scope: Optional[Dict[str, Any]]
    
    # Metadata and classification
    query_type: str  # "simple_lookup", "relationship", "aggregate", "structural"
    requires_scout: bool
    
    # Context collected
    vector_results: List[Dict[str, Any]]
    graph_context: str
    backbone_relations: str
    
    # Final Output
    answer: str
    citations: List[Dict[str, Any]]
    related_nodes: List[str]
    error: Optional[str]


# ===== Node 1: Router Node =====
async def router_node(state: ChatState) -> Dict[str, Any]:
    """Classifies user queries to determine routing path."""
    question = state["question"]
    classification_prompt = f"""
    Classify this user question as one of:
    1. "simple_lookup" - Direct entity/attribute lookup (e.g., "Who is John?", "What is the value?")
    2. "relationship" - Finding connections (e.g., "How are X and Y connected?")
    3. "aggregate" - Statistical/analytical (e.g., "What's the average?", "Top 10 by...")
    4. "structural" - Complex graph patterns (e.g., "Hidden connections", "Structural analysis")
    
    Question: {question}
    
    Respond with JSON:
    {{
        "query_type": "simple_lookup" | "relationship" | "aggregate" | "structural",
        "requires_scout": false | true,
        "confidence": 0.0-1.0,
        "reasoning": "brief explanation"
    }}
    """
    
    ai = get_ai_service()
    try:
        result = await ai.chat_json([{
            "role": "user",
            "content": classification_prompt
        }])
        
        return {
            "query_type": result.get("query_type", "simple_lookup"),
            "requires_scout": result.get("requires_scout", False)
        }
    except Exception as e:
        logger.warning(f"LangGraph Router: Classification failed ({e}), defaulting to simple_lookup")
        return {
            "query_type": "simple_lookup",
            "requires_scout": False
        }


# ===== Node 2: Retriever Node =====
async def retriever_node(state: ChatState) -> Dict[str, Any]:
    """Retrieves nodes using parallel vector and lexical search in Neo4j."""
    question = state["question"]
    scope = state["scope"]
    
    # Simple tokenization for lexical search fallback
    terms = [w.strip("?,.!").lower() for w in question.split() if len(w) > 2][:10]
    params = {
        "terms": terms,
        "top_k": 10
    }
    
    scope_filter = ""
    if scope:
        s_type = scope.get("type")
        s_id = scope.get("id")
        if s_type == "folder":
            scope_filter = "AND node.folder_id = $scope_id"
            params["scope_id"] = s_id
        elif s_type == "file":
            scope_filter = "AND node.file_id = $scope_id"
            params["scope_id"] = s_id
        elif s_type == "selection":
            node_ids = s_id.split(",")
            scope_filter = "AND (node.id IN $node_ids OR elementId(node) IN $node_ids)"
            params["node_ids"] = node_ids
            
    # Vector query
    ai = get_ai_service()
    try:
        embedding = await ai.embed(question)
        params["embedding"] = embedding
        
        vector_query = f"""
        CALL db.index.vector.queryNodes('{settings.VECTOR_INDEX_NAME}', $top_k, $embedding) 
        YIELD node, score
        WHERE node.name IS NOT NULL {scope_filter}
        RETURN 
            COALESCE(node.id, elementId(node)) as node_id,
            node.name as name,
            COALESCE(node.description, '') as description,
            labels(node)[0] as type,
            score
        """
    except Exception as e:
        logger.error(f"LangGraph Retriever: Embedding generation failed: {e}")
        vector_query = None

    # Lexical query
    lexical_query = f"""
    MATCH (node)
    WHERE node.name IS NOT NULL
    AND (ANY(term IN $terms WHERE toLower(node.name) CONTAINS term 
             OR toLower(node.description) CONTAINS term))
    {scope_filter}
    RETURN 
        COALESCE(node.id, elementId(node)) as node_id,
        node.name as name,
        COALESCE(node.description, '') as description,
        labels(node)[0] as type,
        0.85 as score
    LIMIT 20
    """
    
    vector_results = []
    lexical_results = []
    
    try:
        neo4j = get_neo4j_driver()
        async with neo4j.session() as session:
            tasks = []
            if vector_query:
                tasks.append(session.run(vector_query, params))
            tasks.append(session.run(lexical_query, params))
            
            completed = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Unpack results
            idx = 0
            if vector_query:
                vec_res = completed[idx]
                if not isinstance(vec_res, Exception):
                    vector_results = await vec_res.data()
                idx += 1
                
            lex_res = completed[idx]
            if not isinstance(lex_res, Exception):
                lexical_results = await lex_res.data()
                
    except Exception as e:
        logger.error(f"LangGraph Retriever: Database queries failed: {e}")
        
    # Deduplicate and merge results
    seen_ids = set()
    all_results = []
    
    for r in vector_results:
        if r["node_id"] not in seen_ids:
            all_results.append(r)
            seen_ids.add(r["node_id"])
            
    for r in lexical_results:
        if r["node_id"] not in seen_ids:
            all_results.append(r)
            seen_ids.add(r["node_id"])
            
    all_results.sort(key=lambda x: x["score"], reverse=True)
    
    return {"vector_results": all_results[:20]}


# ===== Node 3: Enricher Node =====
async def enricher_node(state: ChatState) -> Dict[str, Any]:
    """Expands graph context concurrently for neighbors, shortest paths, and backbone relationships."""
    vector_results = state["vector_results"]
    scope = state["scope"]
    
    if not vector_results:
        return {"graph_context": "", "backbone_relations": ""}
        
    node_ids = [r["node_id"] for r in vector_results[:10]]
    params = {"node_ids": node_ids}
    
    scope_filter = ""
    if scope:
        sid = scope.get("id")
        if scope.get("type") == "folder":
            scope_filter = "AND (related.folder_id = $sid OR r.folder_id = $sid)"
            params["sid"] = sid
        elif scope.get("type") == "file":
            scope_filter = "AND ($sid IN related.file_ids OR related.file_id = $sid)"
            params["sid"] = sid
            
    # Context queries
    neighbors_query = f"""
    UNWIND $node_ids AS nodeId
    MATCH (n) WHERE n.id = nodeId OR elementId(n) = nodeId
    OPTIONAL MATCH (n)-[r]-(related) WHERE related IS NOT NULL {scope_filter}
    RETURN n.name as source_name, type(r) as rel_type, related.name as related_name
    LIMIT 30
    """
    
    path_query = f"""
    MATCH (n) WHERE (n.id IN $node_ids OR elementId(n) IN $node_ids)
    WITH collect(n) as seedNodes
    UNWIND seedNodes as n1
    UNWIND seedNodes as n2
    WITH n1, n2 WHERE elementId(n1) < elementId(n2)
    MATCH p = shortestPath((n1)-[*..8]-(n2))
    RETURN [node in nodes(p) | node.name] as names, [rel in relationships(p) | type(rel)] as types
    LIMIT 10
    """
    
    backbone_query = f"""
    MATCH ()-[r]->()
    WHERE ($sid IS NULL) OR (r.folder_id = $sid OR r.file_id = $sid)
    WITH type(r) AS relType, count(*) AS relCount
    ORDER BY relCount DESC
    LIMIT 5
    RETURN relType as relationshipType
    """
    if "sid" not in params:
        params["sid"] = None
        
    try:
        neo4j = get_neo4j_driver()
        async with neo4j.session() as session:
            neighbors_res, paths_res, backbone_res = await asyncio.gather(
                session.run(neighbors_query, params),
                session.run(path_query, params),
                session.run(backbone_query, params),
                return_exceptions=True
            )
            
            nodes = set()
            rels = []
            backbone_types = []
            
            # Neighbors
            if not isinstance(neighbors_res, Exception):
                neighbors_data = await neighbors_res.data()
                for r in neighbors_data:
                    source = r["source_name"]
                    rel = r["rel_type"]
                    target = r["related_name"]
                    nodes.add(source)
                    if target:
                        nodes.add(target)
                        rels.append(f"{source} -[{rel}]-> {target}")
                        
            # Paths
            if not isinstance(paths_res, Exception):
                paths_data = await paths_res.data()
                for r in paths_data:
                    names = r["names"]
                    types = r["types"]
                    path_str = ""
                    for i in range(len(types)):
                        path_str += f"{names[i]} -[{types[i]}]-> "
                    path_str += names[-1]
                    rels.append(f"PATH: {path_str}")
                    for name in names:
                        nodes.add(name)
                        
            # Backbone
            if not isinstance(backbone_res, Exception):
                backbone_data = await backbone_res.data()
                backbone_types = [r["relationshipType"] for r in backbone_data]
                
    except Exception as e:
        logger.error(f"LangGraph Enricher: Context expansion failed: {e}")
        return {"graph_context": "", "backbone_relations": ""}
        
    # Build text context block
    context = "Knowledge Base Context:\n"
    for r in vector_results[:10]:
        context += f"- {r['name']} [{r['type']}]: {r['description'][:200]}\n"
        
    if rels:
        context += "\nRelationships:\n"
        for rel in rels[:8]:
            context += f"- {rel}\n"
            
    return {
        "graph_context": context,
        "backbone_relations": ", ".join(backbone_types)
    }


# ===== Node 4: Synthesizer Node =====
async def synthesizer_node(state: ChatState) -> Dict[str, Any]:
    """Generates the final response using Ollama LLM."""
    graph_context = state.get("graph_context", "")
    backbone = state.get("backbone_relations", "")
    question = state["question"]
    
    if not graph_context.strip():
        return {
            "answer": "No information found in knowledge base.",
            "citations": [],
            "related_nodes": []
        }
        
    system_prompt = get_hybrid_rag_system_prompt(graph_context=graph_context, backbone=backbone)
    user_prompt = f"{graph_context}\n\nQuestion: {question}"
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    ai = get_ai_service()
    try:
        answer_content = await ai.chat(messages)
        
        # Prepare citations from retrieved nodes
        vector_results = state.get("vector_results", [])
        citations = [
            {"node_id": r["node_id"], "node_name": r["name"], "score": r["score"]}
            for r in vector_results[:5]
        ]
        related_nodes = [r["node_id"] for r in vector_results[:5]]
        
        return {
            "answer": answer_content,
            "citations": citations,
            "related_nodes": related_nodes
        }
    except Exception as e:
        logger.error(f"LangGraph Synthesizer: Chat generation failed: {e}")
        return {
            "answer": f"Error generating answer: {str(e)}",
            "citations": [],
            "related_nodes": [],
            "error": str(e)
        }


# ===== Conditional Router Link =====
def route_decision(state: ChatState) -> str:
    """Helper to determine edge routing."""
    # We can route simple lookups directly to retriever, and structural to retriever too
    # If there's an error or no question, we could route to END.
    if not state["question"]:
        return END
    return "retriever"


# ===== Build and Compile Chat Graph =====
def build_chat_graph():
    """Builds the LangGraph state machine for chat query workflow."""
    workflow = StateGraph(ChatState)
    
    # Add Nodes
    workflow.add_node("router", router_node)
    workflow.add_node("retriever", retriever_node)
    workflow.add_node("enricher", enricher_node)
    workflow.add_node("synthesizer", synthesizer_node)
    
    # Connect Graph
    workflow.set_entry_point("router")
    
    # Standard edges
    workflow.add_edge("router", "retriever")
    workflow.add_edge("retriever", "enricher")
    workflow.add_edge("enricher", "synthesizer")
    workflow.add_edge("synthesizer", END)
    
    return workflow.compile()


# ===== Service Interface for API Routes =====
class LangGraphRAGService:
    """Service wrapper exposing the LangGraph chat engine."""
    
    def __init__(self):
        self.graph = build_chat_graph()
        
    async def query(
        self,
        question: str,
        session_id: str,
        history: List[Dict[str, str]] = None,
        scope: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Runs the LangGraph to completion and returns standard dictionary response."""
        initial_state = {
            "question": question,
            "session_id": session_id,
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
        
        try:
            final_state = await self.graph.ainvoke(initial_state)
            return {
                "answer": final_state.get("answer", ""),
                "citations": final_state.get("citations", []),
                "session_id": session_id,
                "related_nodes": final_state.get("related_nodes", []),
                "error": final_state.get("error")
            }
        except Exception as e:
            logger.error(f"LangGraph query failed: {e}", exc_info=True)
            return {
                "answer": f"Workflow execution failed: {str(e)}",
                "citations": [],
                "session_id": session_id,
                "related_nodes": [],
                "error": str(e)
            }
            
    async def query_streaming(
        self,
        question: str,
        session_id: str,
        history: List[Dict[str, str]] = None,
        scope: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Runs context retrieval nodes using LangGraph,
        then streams response tokens directly from Ollama.
        """
        initial_state = {
            "question": question,
            "session_id": session_id,
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
        
        # Step 1: Run graph nodes up to before synthesizer for context assembly
        try:
            # We construct a sub-graph or run the full graph context nodes
            # To be simple and robust: we can invoke the graph nodes sequentially up to enricher
            # using state updates, or run ainvoke on a sub-graph. 
            # Even simpler: we execute the nodes directly in order using initial_state
            # to assemble the state context, and then stream. This avoids complex graph slicing.
            
            state = initial_state
            state.update(await router_node(state))
            state.update(await retriever_node(state))
            state.update(await enricher_node(state))
            
            graph_context = state.get("graph_context", "")
            backbone = state.get("backbone_relations", "")
            
            if not graph_context.strip():
                yield "No information found in knowledge base."
                return
                
            system_prompt = get_hybrid_rag_system_prompt(graph_context=graph_context, backbone=backbone)
            user_prompt = f"{graph_context}\n\nQuestion: {question}"
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            ai = get_ai_service()
            async for chunk in ai.llm.astream(user_prompt):
                # Handle ChatOllama response chunk format which might be AIMessageChunk or string
                if hasattr(chunk, "content"):
                    yield chunk.content
                else:
                    yield str(chunk)
                    
        except Exception as e:
            logger.error(f"LangGraph query_streaming failed: {e}", exc_info=True)
            yield f"Error in streaming workflow: {str(e)}"

# Singleton
_langgraph_rag_service: Optional[LangGraphRAGService] = None

def get_langgraph_rag_service() -> LangGraphRAGService:
    global _langgraph_rag_service
    if _langgraph_rag_service is None:
        _langgraph_rag_service = LangGraphRAGService()
    return _langgraph_rag_service
