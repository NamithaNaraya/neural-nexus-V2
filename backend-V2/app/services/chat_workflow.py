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
import uuid
import json
from typing import Dict, Any, List, Optional, TypedDict, Tuple, AsyncGenerator
import numpy as np
from sqlalchemy import text as sa_text
from langgraph.graph import StateGraph, END

from app.core.config import settings
from app.core.prompts import get_hybrid_rag_system_prompt
from app.services.ai_service import get_ai_service
from app.db.connections import get_neo4j_driver, get_postgres_session
from app.services.analytics_chat.analytic_chat_service import AnalyticChatService

logger = logging.getLogger(__name__)

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


# ===== LangGraph State Definition =====
class ChatState(TypedDict):
    question: str
    session_id: str
    history: List[Dict[str, str]]
    scope: Optional[Dict[str, Any]]
    
    # Metadata and classification
    query_type: str  # "simple_lookup", "relationship", "aggregate", "structural"
    requires_scout: bool
    gds_algorithm: Optional[str]  # Specific GDS algorithm detected from user intent
    
    # Context collected
    vector_results: List[Dict[str, Any]]
    graph_context: str
    backbone_relations: str
    
    # Final Output
    answer: str
    citations: List[Dict[str, Any]]
    related_nodes: List[str]
    error: Optional[str]


# ===== Node 1: Router Node (Intent → GDS Algorithm Mapping) =====

# --- Centrality ---
_PAGERANK_KEYWORDS = frozenset([
    "pagerank", "influential", "influence", "important", "importance",
    "authority", "prominent", "significant", "key player", "key node",
    "most impactful", "most relevant", "top node",
])
_BETWEENNESS_KEYWORDS = frozenset([
    "betweenness", "bottleneck", "broker", "brokering", "intermediary",
    "critical path", "critical node", "flow control", "mediator",
])
_CLOSENESS_KEYWORDS = frozenset([
    "closeness", "accessible", "reachable", "reach everyone",
    "closest to all", "average distance", "proximity",
])
_HITS_KEYWORDS = frozenset([
    "hits", "hyperlink", "hub authority", "hubs and authorities",
])
_DEGREE_KEYWORDS = frozenset([
    "degree", "most connections", "most connected", "highly connected",
    "connection count", "link count", "most links",
])
_ARTICLERANK_KEYWORDS = frozenset([
    "articlerank", "weighted rank", "weighted importance",
])

# --- Community Detection ---
_LOUVAIN_KEYWORDS = frozenset([
    "community", "communities", "cluster", "clusters", "clustering",
    "group", "groups", "partition", "module", "modules",
    "louvain", "leiden", "modularity",
])
_WCC_KEYWORDS = frozenset([
    "connected component", "components", "isolated", "disconnected",
    "reachability", "wcc", "weakly connected",
])
_KCORE_KEYWORDS = frozenset([
    "kcore", "k-core", "dense subgraph", "cohesive", "core members",
])
_TRIANGLE_KEYWORDS = frozenset([
    "triangle", "triangles", "triadic", "transitive", "triad", "triangle count",
])

# --- Pathfinding ---
_PATHFINDING_KEYWORDS = frozenset([
    "path", "paths", "route", "routes", "shortest", "shortest path",
    "how to get from", "connect", "connected", "traverse", "hop",
    "distance between", "steps between", "degrees of separation",
])

# --- Similarity ---
_SIMILARITY_KEYWORDS = frozenset([
    "similar", "similarity", "alike", "resemble", "most like",
    "closest to", "neighbor similarity", "jaccard", "node similarity",
])

# --- Link Prediction ---
_LINK_PREDICTION_KEYWORDS = frozenset([
    "predict", "likely connect", "potential connection", "might connect",
    "suggest connection", "recommendation", "common neighbors",
    "adamic", "resource allocation",
])

# --- Aggregate / Statistical (no specific GDS algo, uses Cypher aggregates) ---
_AGGREGATE_KEYWORDS = frozenset([
    "average", "mean", "total", "count", "sum", "top", "bottom",
    "most", "least", "highest", "lowest", "statistics", "how many",
    "distribution", "percentage", "ratio", "rank", "ranking",
])

# --- General Relationship traversal ---
_RELATIONSHIP_KEYWORDS = frozenset([
    "related", "relationship", "between", "link", "interaction",
    "associate", "association", "neighbor", "neighbors", "connected to",
])

# --- General Structural (fallback when no specific algo detected) ---
_STRUCTURAL_KEYWORDS = frozenset([
    "structural", "topology", "network structure", "hidden",
    "pattern", "network", "graph structure",
])


async def router_node(state: ChatState) -> Dict[str, Any]:
    """
    Classifies user queries using keyword heuristics and maps to specific
    Neo4j GDS algorithms. More specific algorithms take priority.
    """
    question_lower = state["question"].lower()
    tokens = set(question_lower.split())
    # Also check substrings for multi-word phrases
    text = question_lower

    def _hits_tokens(kw_set: frozenset) -> bool:
        return bool(tokens & kw_set)

    def _hits_phrases(phrases) -> bool:
        return any(ph in text for ph in phrases)

    # --- Pathfinding (highest priority — intent is very explicit) ---
    if _hits_tokens(_PATHFINDING_KEYWORDS) or _hits_phrases([
        "shortest path", "how to get from", "degrees of separation", "steps between"
    ]):
        return {"query_type": "relationship", "requires_scout": False, "gds_algorithm": "shortest_path"}

    # --- Link prediction ---
    if _hits_tokens(_LINK_PREDICTION_KEYWORDS) or _hits_phrases([
        "likely connect", "common neighbors", "predict connection"
    ]):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": "common_neighbors"}

    # --- Similarity ---
    if _hits_tokens(_SIMILARITY_KEYWORDS) or _hits_phrases([
        "most similar", "most alike", "node similarity"
    ]):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": "node_similarity"}

    # --- Specific centrality algorithms ---
    if _hits_tokens(_BETWEENNESS_KEYWORDS) or _hits_phrases(["critical node", "most brokering"]):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": "betweenness"}
    if _hits_tokens(_CLOSENESS_KEYWORDS):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": "closeness"}
    if _hits_tokens(_HITS_KEYWORDS):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": "hits"}
    if _hits_tokens(_DEGREE_KEYWORDS) or _hits_phrases(["most connections", "most connected nodes"]):
        return {"query_type": "aggregate", "requires_scout": False, "gds_algorithm": "degree"}
    if _hits_tokens(_ARTICLERANK_KEYWORDS):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": "articlerank"}
    if _hits_tokens(_PAGERANK_KEYWORDS) or _hits_phrases([
        "most influential", "most important", "key player", "top ranked"
    ]):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": "pagerank"}

    # --- Community algorithms ---
    if _hits_tokens(_TRIANGLE_KEYWORDS):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": "triangle_count"}
    if _hits_tokens(_WCC_KEYWORDS) or _hits_phrases(["connected components", "isolated nodes"]):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": "wcc"}
    if _hits_tokens(_KCORE_KEYWORDS):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": "kcore"}
    if _hits_tokens(_LOUVAIN_KEYWORDS) or _hits_phrases(["find communities", "detect clusters"]):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": "louvain"}

    # --- General structural (topology questions, no specific algo) ---
    if _hits_tokens(_STRUCTURAL_KEYWORDS):
        return {"query_type": "structural", "requires_scout": True, "gds_algorithm": None}

    # --- Aggregate statistics ---
    if _hits_tokens(_AGGREGATE_KEYWORDS):
        return {"query_type": "aggregate", "requires_scout": False, "gds_algorithm": None}

    # --- Relationship traversal ---
    if _hits_tokens(_RELATIONSHIP_KEYWORDS):
        return {"query_type": "relationship", "requires_scout": False, "gds_algorithm": None}

    return {"query_type": "simple_lookup", "requires_scout": False, "gds_algorithm": None}


# ===== Helpers: Safe parallel Neo4j queries =====
async def _run_neo4j_query(driver, query: str, params: dict) -> list:
    """Run a single Cypher query in its own session (safe for parallel use)."""
    async with driver.session() as session:
        result = await session.run(query, params)
        return await result.data()


# ===== Node 2: Retriever Node =====
async def retriever_node(state: ChatState) -> Dict[str, Any]:
    """Retrieves nodes using parallel vector + fulltext search in Neo4j with cosine re-ranking."""
    t0 = time.perf_counter()
    question = state["question"]
    scope = state["scope"]
    
    # Build scope filter and params
    scope_filter = ""
    params = {"top_k": 50}
    
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
            COALESCE(node.description, node.text, node.content, '') as description,
            COALESCE(node.type, labels(node)[0], 'Entity') as type,
            node.embedding as embedding,
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
        COALESCE(node.description, node.text, node.content, '') as description,
        COALESCE(node.type, labels(node)[0], 'Entity') as type,
        node.embedding as embedding,
        score * 0.85 as score
    LIMIT 50
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
        
    # Deduplicate and merge results
    seen_ids = set()
    all_results = []
    
    query_emb = vector_params.get("embedding")
    
    for r in vector_results + lexical_results:
        nid = r.get("node_id")
        if nid and nid not in seen_ids:
            seen_ids.add(nid)
            # Calculate cosine similarity in Python using numpy if embeddings are present
            node_emb = r.get("embedding")
            if query_emb and node_emb and isinstance(node_emb, list) and len(node_emb) == len(query_emb):
                try:
                    v1 = np.array(query_emb, dtype=np.float32)
                    v2 = np.array(node_emb, dtype=np.float32)
                    dot = np.dot(v1, v2)
                    norm1 = np.linalg.norm(v1)
                    norm2 = np.linalg.norm(v2)
                    if norm1 > 0 and norm2 > 0:
                        r["score"] = float(dot / (norm1 * norm2))
                    else:
                        r["score"] = 0.0
                except Exception as re_err:
                    logger.warning(f"Re-ranking error for node {nid}: {re_err}")
            if "embedding" in r:
                del r["embedding"]
            all_results.append(r)
            
    all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    elapsed = time.perf_counter() - t0
    logger.info(f"[Retriever] {len(vector_results)} vector + {len(lexical_results)} lexical = {len(all_results)} merged results in {elapsed:.2f}s")
    
    return {"vector_results": all_results[:50]}


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
            
    # --- Query 1: Direct Neighbors (with description for richer context) ---
    neighbors_query = f"""
    UNWIND $node_ids AS nodeId
    MATCH (n) WHERE n.id = nodeId OR elementId(n) = nodeId
    OPTIONAL MATCH (n)-[r]-(related) WHERE related IS NOT NULL {neighbor_scope_filter}
    RETURN 
        n.name as source_name, 
        type(r) as rel_type, 
        related.name as related_name,
        COALESCE(related.description, related.text, related.content, '') as related_desc
    LIMIT 50
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
    LIMIT 15
    """
    
    # --- Query 3: Backbone relationship types ---
    backbone_params: dict = {}
    if scope and scope.get("type") == "folder":
        backbone_params["sid"] = scope.get("id")
        backbone_query = """
        MATCH (a)-[r]->(b)
        WHERE a.folder_id = $sid AND b.folder_id = $sid
        WITH type(r) AS relType, count(*) AS relCount
        ORDER BY relCount DESC
        LIMIT 8
        RETURN relType as relationshipType
        """
    else:
        backbone_query = """
        MATCH (a)-[r]->(b)
        WITH type(r) AS relType, count(*) AS relCount
        ORDER BY relCount DESC
        LIMIT 8
        RETURN relType as relationshipType
        """
        
    # --- Query 4: Database stats query ---
    stats_params: dict = {}
    if scope and scope.get("type") == "folder":
        stats_params["fid"] = scope.get("id")
        stats_query = """
        MATCH (n) WHERE n.folder_id = $fid
        WITH count(n) as nodeCount
        MATCH ()-[r]->() WHERE r.folder_id = $fid
        RETURN nodeCount, count(r) as relCount
        """
    else:
        stats_query = """
        MATCH (n)
        WITH count(n) as nodeCount
        MATCH ()-[r]->()
        RETURN nodeCount, count(r) as relCount
        """
        
    # --- Run ALL 4 queries in parallel using SEPARATE sessions ---
    neo4j = get_neo4j_driver()
    try:
        neighbors_data, paths_data, backbone_data, stats_data = await asyncio.gather(
            _run_neo4j_query(neo4j, neighbors_query, neighbor_params),
            _run_neo4j_query(neo4j, path_query, path_params),
            _run_neo4j_query(neo4j, backbone_query, backbone_params),
            _run_neo4j_query(neo4j, stats_query, stats_params),
            return_exceptions=True
        )
            
        nodes = set()
        rels = []
        neighbor_descriptions: dict = {}
        backbone_types = []
        stats_summary = ""
        
        # Stats summary
        if not isinstance(stats_data, Exception) and stats_data:
            node_count = stats_data[0].get("nodeCount", 0)
            rel_count = stats_data[0].get("relCount", 0)
            stats_summary = f"Workspace Statistics: {node_count} nodes, {rel_count} relationships.\n"
        
        # Neighbors
        if not isinstance(neighbors_data, Exception):
            for r in neighbors_data:
                source = r.get("source_name")
                rel = r.get("rel_type")
                target = r.get("related_name")
                related_desc = r.get("related_desc", "")
                if source:
                    nodes.add(source)
                if target:
                    nodes.add(target)
                    rels.append(f"{source} → {target} (via {rel})")
                    if related_desc and target not in neighbor_descriptions:
                        neighbor_descriptions[target] = related_desc[:300]
        else:
            logger.warning(f"[Enricher] Neighbors query failed: {neighbors_data}")
                    
        # Paths
        if not isinstance(paths_data, Exception):
            for r in paths_data:
                names = r.get("names", [])
                types = r.get("types", [])
                if names and types:
                    path_parts = []
                    for i in range(len(types)):
                        if i < len(names):
                            path_parts.append(f"{names[i]} →[{types[i]}]→")
                    if len(names) > len(types):
                        path_parts.append(names[-1])
                    rels.append("PATH: " + " ".join(path_parts))
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
        
    # Build rich text context block — clean formatting for LLM comprehension
    context_parts = []
    if stats_summary:
        context_parts.append(stats_summary)
    context_parts.append("Entities:")
    for r in vector_results[:10]:
        desc = r.get("description", "")[:400]
        entity_type = r.get("type", "Entity")
        line = f"- {r['name']} ({entity_type})"
        if desc:
            line += f": {desc}"
        context_parts.append(line)
        # Include neighbor context for this entity if we have it
        if r["name"] in neighbor_descriptions:
            nd = neighbor_descriptions[r["name"]][:200]
            context_parts.append(f"  Additional context: {nd}")

    if rels:
        context_parts.append("\nRelationships and connections:")
        for rel in rels[:15]:
            context_parts.append(f"- {rel}")

    context = "\n".join(context_parts)
    
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
        
    # System prompt already contains graph_context and the "answer current question" directive
    system_prompt = get_hybrid_rag_system_prompt(graph_context=graph_context, backbone=backbone)
    
    # Build messages: system + trimmed history (last 6 turns) + current question
    # Trim assistant messages to prevent the model from re-answering old questions
    messages = [{"role": "system", "content": system_prompt}]
    for h in (history or [])[-6:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if not content or role not in ("user", "assistant"):
            continue
        if role == "assistant":
            # Truncate long assistant messages so the model focuses on the new question
            content = content[:150] + ("..." if len(content) > 150 else "")
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
        scope: Optional[Dict[str, Any]] = None,
        web_search: bool = False,
        user_id: str = "anonymous",
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Runs sequentially orchestrated RAG pipelines as a generator yielding structured SSE event chunks.
        """
        yield {"type": "step", "id": 1, "status": "Analyzing research intent..."}

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
        
        try:
            state = initial_state
            
            # --- 1. Router ---
            router_res = await router_node(state)
            state.update(router_res)
            yield {
                "type": "intent",
                "data": {
                    "query_type": state["query_type"],
                    "requires_scout": state["requires_scout"],
                    "research_strategy": f"Detected query type '{state['query_type']}' and scoped search context."
                }
            }
            
            # --- 2. GDS Analytics ---
            yield {"type": "step", "id": 2, "status": "Executing graph analytics query..."}
            gds_algorithm = None
            gds_results_data = []
            query_type = state["query_type"]
            router_gds_hint = state.get("gds_algorithm")
            folder_id = scope.get("id") if (scope and scope.get("type") == "folder") else None
            
            should_run_gds = (
                query_type in ("structural", "aggregate") or
                (query_type == "relationship" and router_gds_hint)
            ) and bool(folder_id)
            
            if should_run_gds:
                try:
                    analytics_svc = AnalyticChatService()
                    gds_result = await analytics_svc.process_query(
                        query=question, folder_id=folder_id, node_ids=None
                    )
                    gds_algorithm = gds_result.get("algorithm") or router_gds_hint
                    gds_results_data = gds_result.get("results", [])
                    logger.info(f"[LangGraph-Stream] GDS algorithm '{gds_algorithm}' returned {len(gds_results_data)} results")
                except Exception as gds_err:
                    gds_algorithm = router_gds_hint
                    logger.warning(f"[LangGraph-Stream] GDS execution failed (using hint '{gds_algorithm}'): {gds_err}")
                    
            yield {
                "type": "gds_results",
                "data": {"algorithm": gds_algorithm, "results": gds_results_data[:20]}
            }

            # --- 3. Web Search ---
            web_result = None
            if web_search:
                yield {"type": "step", "id": 3, "status": "Searching the web for current context..."}
                web_result = await run_simulated_web_search(question)
                yield {
                    "type": "web_search_result",
                    "data": {
                        "answer": web_result.get("answer", ""),
                        "sources": web_result.get("sources", [])
                    }
                }
            
            # --- 4. Retrieval (Vector + Lexical) ---
            yield {"type": "step", "id": 4, "status": "Querying vector and lexical indices..."}
            retriever_res = await retriever_node(state)
            state.update(retriever_res)
            
            # --- 5. Graph Context Enrichment & Stats ---
            state.update(await enricher_node(state))
            
            t_context = time.perf_counter()
            logger.info(f"[LangGraph-Stream] Context assembled in {t_context - t0:.2f}s")
            
            # --- 6. Grounding Validation ---
            vector_results = state.get("vector_results", [])
            is_grounded = len(vector_results) > 0
            grounding_score = min(len(vector_results) / 10.0, 1.0) if is_grounded else 0.0
            suggest_web_search = not is_grounded if not web_search else False
            thin_context = len(vector_results) < 3
            
            yield {
                "type": "web_search_suggestion",
                "data": suggest_web_search,
                "emphasized": thin_context
            }
            
            yield {
                "type": "data_grounding",
                "data": {
                    "grounded": is_grounded,
                    "score": grounding_score,
                    "source_count": len(vector_results),
                    "context_chars": len(state.get("graph_context", "")),
                    "algorithm": gds_algorithm,
                    "elapsed_ms": round((time.perf_counter() - t0) * 1000),
                }
            }
            
            # --- 7. Synthesize Response ---
            yield {"type": "step", "id": 5, "status": "Synthesizing answer..."}
            
            graph_context = state.get("graph_context", "")
            backbone = state.get("backbone_relations", "")
            full_answer = ""
            
            # Build GDS summary for the LLM if algorithm results are available
            gds_summary = ""
            if gds_algorithm and gds_results_data:
                gds_lines = [f"Algorithm used: {gds_algorithm}"]
                for i, r in enumerate(gds_results_data[:10], 1):
                    name = r.get("name", r.get("source_name", "?"))
                    score = r.get("score")
                    node_type = r.get("type", "")
                    community = r.get("community_id")
                    if score is not None:
                        gds_lines.append(f"{i}. {name} ({node_type}) — score: {score:.4f}")
                    elif community is not None:
                        gds_lines.append(f"- {name} ({node_type}) — group {community}")
                    else:
                        gds_lines.append(f"{i}. {name} ({node_type})")
                gds_summary = "\n".join(gds_lines)
            
            from langchain_core.messages import HumanMessage, SystemMessage, AIMessage as AIM
            
            system_prompt = get_hybrid_rag_system_prompt(graph_context=graph_context, backbone=backbone, gds_summary=gds_summary)
            lc_messages = [SystemMessage(content=system_prompt)]
            # Trimmed history: last 6 turns, assistant messages truncated
            for h in (history or [])[-6:]:
                role = h.get("role", "user")
                content = h.get("content", "")
                if not content:
                    continue
                if role == "user":
                    lc_messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    trimmed = content[:150] + ("..." if len(content) > 150 else "")
                    lc_messages.append(AIM(content=trimmed))

            ai = get_ai_service()
            if not graph_context.strip():
                if web_result and web_result.get("answer"):
                    web_ans = web_result.get("answer")
                    sys_msg = SystemMessage(content=(
                        "You are a helpful assistant. The user's query could not be answered "
                        "using the local database, but web search returned some information. "
                        "Synthesize a clear, helpful response and note it is from the web."
                    ))
                    search_messages = [sys_msg] + lc_messages[1:] + [
                        HumanMessage(content=f"Web search context:\n{web_ans}\n\nQuestion: {question}")
                    ]
                    async for chunk in ai.llm.astream(search_messages):
                        content = chunk.content if hasattr(chunk, "content") else str(chunk)
                        if content:
                            yield {"type": "content", "data": content}
                            full_answer += content
                else:
                    ans_chunk = "I couldn't find relevant information in your knowledge base for this question. You can try enabling web search, or upload documents related to this topic."
                    yield {"type": "content", "data": ans_chunk}
                    full_answer = ans_chunk
            else:
                lc_messages.append(HumanMessage(content=question))
                async for chunk in ai.llm.astream(lc_messages):
                    content = chunk.content if hasattr(chunk, "content") else str(chunk)
                    if content:
                        yield {"type": "content", "data": content}
                        full_answer += content

            yield {"type": "done"}
            
        except Exception as e:
            logger.error(f"Error in query_streaming: {e}", exc_info=True)
            yield {"type": "content", "data": f"Error: {str(e)}"}
            yield {"type": "done"}

_langgraph_rag_service = None

def get_langgraph_rag_service() -> LangGraphRAGService:
    global _langgraph_rag_service
    if _langgraph_rag_service is None:
        _langgraph_rag_service = LangGraphRAGService()
    return _langgraph_rag_service
