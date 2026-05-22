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
import time
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


# ===== Node 1: Router Node (Fast Heuristic) =====
_AGGREGATE_KEYWORDS = frozenset([
    "average", "mean", "total", "count", "sum", "top", "bottom",
    "most", "least", "highest", "lowest", "statistics", "how many",
    "distribution", "percentage", "ratio", "rank",
])
_RELATIONSHIP_KEYWORDS = frozenset([
    "connected", "related", "relationship", "between", "link",
    "path", "connection", "interact", "associate", "neighbor",
])
_STRUCTURAL_KEYWORDS = frozenset([
    "hidden", "structural", "cluster", "community", "central",
    "bridge", "hub", "pattern", "topology", "network",
])


async def router_node(state: ChatState) -> Dict[str, Any]:
    """Classifies user queries using fast keyword heuristics (no LLM call)."""
    question_lower = state["question"].lower()
    tokens = set(question_lower.split())

    if tokens & _STRUCTURAL_KEYWORDS:
        return {"query_type": "structural", "requires_scout": True}
    if tokens & _AGGREGATE_KEYWORDS:
        return {"query_type": "aggregate", "requires_scout": False}
    if tokens & _RELATIONSHIP_KEYWORDS:
        return {"query_type": "relationship", "requires_scout": False}
    return {"query_type": "simple_lookup", "requires_scout": False}


# ===== Helpers: Safe parallel Neo4j queries =====
async def _run_neo4j_query(driver, query: str, params: dict) -> list:
    """Run a single Cypher query in its own session (safe for parallel use)."""
    async with driver.session() as session:
        result = await session.run(query, params)
        return await result.data()


# ===== Node 2: Retriever Node =====
async def retriever_node(state: ChatState) -> Dict[str, Any]:
    """Retrieves nodes using parallel vector + fulltext search in Neo4j."""
    t0 = time.perf_counter()
    question = state["question"]
    scope = state["scope"]
    
    # Build scope filter and params
    scope_filter = ""
    params = {"top_k": 15}
    
    if scope:
        s_type = scope.get("type")
        s_id = scope.get("id")
        if s_type == "folder":
            scope_filter = "AND node.folder_id = $scope_id"
            params["scope_id"] = s_id
        elif s_type == "file":
            scope_filter = "AND ($scope_id IN node.file_ids OR node.file_id = $scope_id)"
            params["scope_id"] = s_id
        elif s_type == "selection":
            node_ids = s_id.split(",")
            scope_filter = "AND (node.id IN $node_ids OR elementId(node) IN $node_ids)"
            params["node_ids"] = node_ids
            
    # --- Vector query ---
    ai = get_ai_service()
    vector_query = None
    vector_params = dict(params)
    try:
        embedding = await ai.embed(question)
        vector_params["embedding"] = embedding
        
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

    # --- Fulltext lexical query (uses the entity_search index) ---
    # Build a Lucene-safe query string from the user question
    raw_terms = [w.strip("?,.!:;'\"()").lower() for w in question.split() if len(w) > 2]
    fulltext_query_str = " OR ".join(raw_terms[:10]) if raw_terms else question
    
    lexical_params = dict(params)
    lexical_params["fulltext_query"] = fulltext_query_str
    
    lexical_query = f"""
    CALL db.index.fulltext.queryNodes('entity_search', $fulltext_query)
    YIELD node, score
    WHERE node.name IS NOT NULL {scope_filter}
    RETURN 
        COALESCE(node.id, elementId(node)) as node_id,
        node.name as name,
        COALESCE(node.description, '') as description,
        labels(node)[0] as type,
        score * 0.85 as score
    LIMIT 20
    """
    
    # --- Run BOTH queries in parallel using SEPARATE sessions ---
    vector_results = []
    lexical_results = []
    neo4j = get_neo4j_driver()
    
    try:
        tasks = []
        if vector_query:
            tasks.append(_run_neo4j_query(neo4j, vector_query, vector_params))
        tasks.append(_run_neo4j_query(neo4j, lexical_query, lexical_params))
        
        completed = await asyncio.gather(*tasks, return_exceptions=True)
        
        idx = 0
        if vector_query:
            if not isinstance(completed[idx], Exception):
                vector_results = completed[idx]
            else:
                logger.warning(f"LangGraph Retriever: Vector search failed: {completed[idx]}")
            idx += 1
            
        if not isinstance(completed[idx], Exception):
            lexical_results = completed[idx]
        else:
            logger.warning(f"LangGraph Retriever: Lexical search failed: {completed[idx]}")
                
    except Exception as e:
        logger.error(f"LangGraph Retriever: Database queries failed: {e}")
        
    # Deduplicate and merge results (vector first for higher precision)
    seen_ids = set()
    all_results = []
    
    for r in vector_results:
        nid = r.get("node_id")
        if nid and nid not in seen_ids:
            all_results.append(r)
            seen_ids.add(nid)
            
    for r in lexical_results:
        nid = r.get("node_id")
        if nid and nid not in seen_ids:
            all_results.append(r)
            seen_ids.add(nid)
            
    all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    elapsed = time.perf_counter() - t0
    logger.info(f"[Retriever] {len(vector_results)} vector + {len(lexical_results)} lexical = {len(all_results)} merged results in {elapsed:.2f}s")
    
    return {"vector_results": all_results[:20]}


# ===== Node 3: Enricher Node =====
async def enricher_node(state: ChatState) -> Dict[str, Any]:
    """Expands graph context concurrently for neighbors, shortest paths, and backbone relationships."""
    t0 = time.perf_counter()
    vector_results = state["vector_results"]
    scope = state["scope"]
    
    if not vector_results:
        logger.info("[Enricher] No vector results to enrich.")
        return {"graph_context": "", "backbone_relations": ""}
        
    node_ids = [r["node_id"] for r in vector_results[:10]]
    
    # Build scope filter for neighbors query (filters on the related node)
    neighbor_scope_filter = ""
    neighbor_params = {"node_ids": node_ids}
    if scope:
        sid = scope.get("id")
        if scope.get("type") == "folder":
            neighbor_scope_filter = "AND related.folder_id = $sid"
            neighbor_params["sid"] = sid
        elif scope.get("type") == "file":
            neighbor_scope_filter = "AND ($sid IN related.file_ids OR related.file_id = $sid)"
            neighbor_params["sid"] = sid
            
    # --- Query 1: Direct Neighbors ---
    neighbors_query = f"""
    UNWIND $node_ids AS nodeId
    MATCH (n) WHERE n.id = nodeId OR elementId(n) = nodeId
    OPTIONAL MATCH (n)-[r]-(related) WHERE related IS NOT NULL {neighbor_scope_filter}
    RETURN n.name as source_name, type(r) as rel_type, related.name as related_name
    LIMIT 30
    """
    
    # --- Query 2: Shortest Paths between seed nodes ---
    path_params = {"node_ids": node_ids}
    path_query = """
    MATCH (n) WHERE (n.id IN $node_ids OR elementId(n) IN $node_ids)
    WITH collect(n) as seedNodes
    UNWIND seedNodes as n1
    UNWIND seedNodes as n2
    WITH n1, n2 WHERE elementId(n1) < elementId(n2)
    MATCH p = shortestPath((n1)-[*..6]-(n2))
    RETURN [node in nodes(p) | node.name] as names, [rel in relationships(p) | type(rel)] as types
    LIMIT 8
    """
    
    # --- Query 3: Backbone relationship types (fixed: filter on NODE folder_id, not relationship) ---
    backbone_params = {"sid": None}
    if scope and scope.get("type") == "folder":
        backbone_params["sid"] = scope.get("id")
    
    backbone_query = """
    MATCH (a)-[r]->(b)
    WHERE ($sid IS NULL OR (a.folder_id = $sid AND b.folder_id = $sid))
    WITH type(r) AS relType, count(*) AS relCount
    ORDER BY relCount DESC
    LIMIT 5
    RETURN relType as relationshipType
    """
        
    # --- Run ALL 3 queries in parallel using SEPARATE sessions ---
    neo4j = get_neo4j_driver()
    try:
        neighbors_data, paths_data, backbone_data = await asyncio.gather(
            _run_neo4j_query(neo4j, neighbors_query, neighbor_params),
            _run_neo4j_query(neo4j, path_query, path_params),
            _run_neo4j_query(neo4j, backbone_query, backbone_params),
            return_exceptions=True
        )
            
        nodes = set()
        rels = []
        backbone_types = []
        
        # Neighbors
        if not isinstance(neighbors_data, Exception):
            for r in neighbors_data:
                source = r.get("source_name")
                rel = r.get("rel_type")
                target = r.get("related_name")
                if source:
                    nodes.add(source)
                if target:
                    nodes.add(target)
                    rels.append(f"{source} -[{rel}]-> {target}")
        else:
            logger.warning(f"[Enricher] Neighbors query failed: {neighbors_data}")
                    
        # Paths
        if not isinstance(paths_data, Exception):
            for r in paths_data:
                names = r.get("names", [])
                types = r.get("types", [])
                if names and types:
                    path_str = ""
                    for i in range(len(types)):
                        path_str += f"{names[i]} -[{types[i]}]-> "
                    path_str += names[-1]
                    rels.append(f"PATH: {path_str}")
                    for name in names:
                        nodes.add(name)
        else:
            logger.warning(f"[Enricher] Paths query failed: {paths_data}")
                    
        # Backbone
        if not isinstance(backbone_data, Exception):
            backbone_types = [r["relationshipType"] for r in backbone_data if r.get("relationshipType")]
        else:
            logger.warning(f"[Enricher] Backbone query failed: {backbone_data}")
                
    except Exception as e:
        logger.error(f"LangGraph Enricher: Context expansion failed: {e}")
        return {"graph_context": "", "backbone_relations": ""}
        
    # Build text context block
    context = "Knowledge Base Context:\n"
    for r in vector_results[:10]:
        desc = r.get('description', '')[:200]
        context += f"- {r['name']} [{r.get('type', 'Entity')}]: {desc}\n"
        
    if rels:
        context += "\nRelationships:\n"
        for rel in rels[:10]:
            context += f"- {rel}\n"
    
    elapsed = time.perf_counter() - t0
    logger.info(f"[Enricher] {len(nodes)} nodes, {len(rels)} rels, {len(backbone_types)} backbone types in {elapsed:.2f}s")
            
    return {
        "graph_context": context,
        "backbone_relations": ", ".join(backbone_types)
    }


# ===== Node 4: Synthesizer Node =====
async def synthesizer_node(state: ChatState) -> Dict[str, Any]:
    """Generates the final response using Ollama LLM."""
    t0 = time.perf_counter()
    graph_context = state.get("graph_context", "")
    backbone = state.get("backbone_relations", "")
    question = state["question"]
    history = state.get("history", [])
    
    if not graph_context.strip():
        return {
            "answer": "I couldn't find relevant information in your knowledge base for this question.",
            "citations": [],
            "related_nodes": []
        }
        
    # System prompt already contains graph_context — don't duplicate it
    system_prompt = get_hybrid_rag_system_prompt(graph_context=graph_context, backbone=backbone)
    
    # Build messages: system + history (last 10 turns) + current question
    messages = [{"role": "system", "content": system_prompt}]
    for h in (history or [])[-10:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if content and role in ("user", "assistant"):
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": question})
    
    ai = get_ai_service()
    try:
        answer_content = await ai.chat(messages)
        elapsed = time.perf_counter() - t0
        logger.info(f"[Synthesizer] LLM response in {elapsed:.2f}s ({len(answer_content)} chars)")
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
        t0 = time.perf_counter()
        
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
            
            t_context = time.perf_counter()
            logger.info(f"[Stream] Context assembly complete in {t_context - t0:.2f}s")
            
            graph_context = state.get("graph_context", "")
            backbone = state.get("backbone_relations", "")
            
            if not graph_context.strip():
                yield "I couldn't find relevant information in your knowledge base for this question."
                return
                
            system_prompt = get_hybrid_rag_system_prompt(graph_context=graph_context, backbone=backbone)
            
            # Build LangChain messages: system + history + question
            from langchain_core.messages import HumanMessage, SystemMessage, AIMessage as AIM
            lc_messages = [SystemMessage(content=system_prompt)]
            for h in (history or [])[-10:]:
                role = h.get("role", "user")
                content = h.get("content", "")
                if not content:
                    continue
                if role == "user":
                    lc_messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    lc_messages.append(AIM(content=content))
            lc_messages.append(HumanMessage(content=question))
            
            ai = get_ai_service()
            async for chunk in ai.llm.astream(lc_messages):
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
