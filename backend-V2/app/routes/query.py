"""
Query Routes

Natural language queries using Hybrid RAG (Vector + Graph).
Supports scoped queries and conversational context.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
import logging
import uuid

from sqlalchemy import text
from app.core.security import get_current_user
from app.db.connections import get_postgres_session, get_redis_client

router = APIRouter()
logger = logging.getLogger(__name__)


def _to_uuid(sid: str) -> str:
    """Safely convert a string into a UUID string, deterministically hashing non-UUIDs."""
    try:
        # If it's already a valid UUID, this succeeds
        return str(uuid.UUID(sid))
    except (ValueError, TypeError):
        # Otherwise, generate a deterministic UUID
        return str(uuid.uuid5(uuid.NAMESPACE_OID, sid))


async def _clear_session_records(
    session_id: str,
    user_id: str,
) -> Dict[str, Any]:
    db_session_id = _to_uuid(session_id)
    folder_ids: List[str] = []

    async with get_postgres_session() as session:
        folder_rows = await session.execute(
            text("""
                SELECT DISTINCT citations->>'folder_id' AS folder_id
                FROM neural_nexus.chat_history
                WHERE session_id = :session_id
                  AND user_id = :user_id
                  AND citations IS NOT NULL
                  AND citations->>'folder_id' IS NOT NULL
                  AND citations->>'folder_id' <> ''
            """),
            {"session_id": db_session_id, "user_id": user_id}
        )
        folder_ids = [str(row["folder_id"]) for row in folder_rows.mappings().all() if row.get("folder_id")]

        await session.execute(
            text("""
                DELETE FROM neural_nexus.outcomes
                WHERE encounter_id IN (
                    SELECT id FROM neural_nexus.encounters
                    WHERE session_id = :session_id AND user_id = :user_id
                )
            """),
            {"session_id": db_session_id, "user_id": user_id}
        )

        await session.execute(
            text("DELETE FROM neural_nexus.encounters WHERE session_id = :session_id AND user_id = :user_id"),
            {"session_id": db_session_id, "user_id": user_id}
        )

        chat_delete_result = await session.execute(
            text("DELETE FROM neural_nexus.chat_history WHERE session_id = :session_id AND user_id = :user_id"),
            {"session_id": db_session_id, "user_id": user_id}
        )

        await session.commit()

    try:
        redis = get_redis_client()
        meta_keys = [f"chat:meta:{session_id}", f"chat:meta:{db_session_id}"]
        meta_values = {}

        for key in meta_keys:
            try:
                values = await redis.hgetall(key)
            except Exception:
                values = {}
            if values:
                meta_values.update(values)

        redis_keys = {
            f"chat:meta:{session_id}",
            f"chat:meta:{db_session_id}",
            f"chat:history:{user_id}:session:{db_session_id}",
        }
        if session_id != db_session_id:
            redis_keys.add(f"chat:history:{user_id}:session:{session_id}")

        history_key = str(meta_values.get("history_key") or "").strip()
        legacy_history_key = str(meta_values.get("legacy_history_key") or "").strip()
        if history_key:
            redis_keys.add(history_key)
        if legacy_history_key:
            redis_keys.add(legacy_history_key)

        for folder_id in folder_ids:
            redis_keys.add(f"chat:history:{user_id}:folder:{folder_id}")
            redis_keys.add(f"chat:history:{user_id}:{folder_id}")

        await redis.delete(*list(redis_keys))
        logger.info(f"Session cleanup completed for session: {session_id}")
    except Exception as re:
        logger.warning(f"Redis cleanup partially failed for session {session_id}: {re}")

    return {
        "db_session_id": db_session_id,
        "folder_ids": folder_ids,
        "rows_removed": chat_delete_result.rowcount,
    }


@router.get("/query/chat/v2/sessions")
async def list_chat_sessions_v2(
    current_user: dict = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """
    List all chat sessions for the current user with metadata for V2.
    Uses an optimized query to get the last message and timestamp for each session.
    """
    async with get_postgres_session() as session:
        # Optimized window function approach for clean distinct sessions with latest message
        result = await session.execute(
            text("""
                WITH session_stats AS (
                    SELECT session_id, count(*) as message_count
                    FROM neural_nexus.chat_history
                    WHERE user_id = :user_id
                    GROUP BY session_id
                ),
                latest_messages AS (
                    SELECT 
                        session_id, 
                        message as last_message, 
                        timestamp as last_activity,
                        citations,
                        ROW_NUMBER() OVER(PARTITION BY session_id ORDER BY timestamp DESC) as rn
                    FROM neural_nexus.chat_history
                    WHERE user_id = :user_id
                )
                SELECT 
                    lm.session_id, 
                    lm.last_message, 
                    lm.last_activity, 
                    ss.message_count,
                    lm.citations->>'folder_id' as folder_id
                FROM latest_messages lm
                JOIN session_stats ss ON lm.session_id = ss.session_id
                WHERE lm.rn = 1
                ORDER BY lm.last_activity DESC
            """),
            {"user_id": current_user['id']}
        )
        return [dict(r) for r in result.mappings().all()]


@router.get("/query/chat/history/{session_id}")
async def get_chat_history(
    session_id: str,
    limit: int = 200,  # Default to full session history
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    db_session_id = _to_uuid(session_id)
    
    async with get_postgres_session() as session:
        # Use a subquery to get the latest messages first, then sort them chronologically 
        # using 'id' as a tie-breaker for identical timestamps.
        result = await session.execute(
            text("""
                SELECT role, message, citations, timestamp
                FROM (
                    SELECT id, role, message, citations, timestamp
                    FROM neural_nexus.chat_history
                    WHERE session_id = :session_id AND user_id = :user_id
                    ORDER BY timestamp DESC, id DESC
                    LIMIT :limit
                ) sub
                ORDER BY timestamp ASC, id ASC
            """),
            {"session_id": db_session_id, "user_id": current_user['id'], "limit": limit}
        )
        raw_msgs = result.mappings().all()
        messages = []
        for r in raw_msgs: # No longer need reversed() because the subquery outer sort handles it
            msg = dict(r)
            citations = msg.get("citations")
            if isinstance(citations, dict):
                # Unpack GDS/Algorithm metadata into root for frontend compatibility
                if "algorithm" in citations:
                    msg["algorithm"] = citations["algorithm"]
                if "gds_results" in citations:
                    msg["results"] = citations["gds_results"]
                if "grounding" in citations:
                    msg["dataGrounding"] = citations["grounding"]
                # Unpack web search attachment into root fields
                web_attachment = citations.get("web_search_attachment")
                if isinstance(web_attachment, dict):
                    msg["webSearchAnswer"] = web_attachment.get("answer", "")
                    msg["webSearchSources"] = web_attachment.get("sources", [])
                    msg["isWebSearch"] = True
                # Unpack general answer marker
                if citations.get("is_general_answer"):
                    msg["isGeneralAnswer"] = True
            messages.append(msg)
        
        return {
            "session_id": session_id,
            "messages": messages,
            "total_count": len(messages),
        }


@router.delete("/query/chat/session/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    db_session_id = _to_uuid(session_id)
    user_id = str(current_user["id"])
    folder_ids: List[str] = []
    async with get_postgres_session() as session:
        folder_rows = await session.execute(
            text("""
                SELECT DISTINCT citations->>'folder_id' AS folder_id
                FROM neural_nexus.chat_history
                WHERE session_id = :session_id
                  AND user_id = :user_id
                  AND citations IS NOT NULL
                  AND citations->>'folder_id' IS NOT NULL
                  AND citations->>'folder_id' <> ''
            """),
            {"session_id": db_session_id, "user_id": user_id}
        )
        folder_ids = [str(row["folder_id"]) for row in folder_rows.mappings().all() if row.get("folder_id")]
        # 1. Delete feedback/outcomes associated with encounters in this session
        await session.execute(
            text("""
                DELETE FROM neural_nexus.outcomes 
                WHERE encounter_id IN (
                    SELECT id FROM neural_nexus.encounters 
                    WHERE session_id = :session_id AND user_id = :user_id
                )
            """),
            {"session_id": db_session_id, "user_id": user_id}
        )

        # 2. Delete reasoning encounters
        await session.execute(
            text("DELETE FROM neural_nexus.encounters WHERE session_id = :session_id AND user_id = :user_id"),
            {"session_id": db_session_id, "user_id": user_id}
        )

        # 3. Delete primary chat history
        chat_delete_result = await session.execute(
            text("DELETE FROM neural_nexus.chat_history WHERE session_id = :session_id AND user_id = :user_id"),
            {"session_id": db_session_id, "user_id": user_id}
        )
        
        await session.commit()

    # 4. Deep cleanup in Redis
    try:
        redis = get_redis_client()
        # Clear session metadata
        meta_keys = [f"chat:meta:{session_id}", f"chat:meta:{db_session_id}"]
        meta_values = {}

        for key in meta_keys:
            try:
                values = await redis.hgetall(key)
            except Exception:
                values = {}
            if values:
                meta_values.update(values)

        redis_keys = {
            f"chat:meta:{session_id}",
            f"chat:meta:{db_session_id}",
            f"chat:history:{user_id}:session:{db_session_id}",
        }
        if session_id != db_session_id:
            redis_keys.add(f"chat:history:{user_id}:session:{session_id}")

        history_key = str(meta_values.get("history_key") or "").strip()
        legacy_history_key = str(meta_values.get("legacy_history_key") or "").strip()
        if history_key:
            redis_keys.add(history_key)
        if legacy_history_key:
            redis_keys.add(legacy_history_key)

        for folder_id in folder_ids:
            redis_keys.add(f"chat:history:{user_id}:folder:{folder_id}")
            redis_keys.add(f"chat:history:{user_id}:{folder_id}")

        await redis.delete(*list(redis_keys))
        
        logger.info(f"🗑️ Deep cleanup completed for session: {session_id}")
    except Exception as re:
        logger.warning(f"Redis cleanup partially failed for session {session_id}: {re}")

    return {
        "success": True,
        "session_id": session_id,
        "message": f"Session {session_id} and all associated records permanently deleted",
        "rows_removed": chat_delete_result.rowcount,
    }


@router.post("/query/chat/session/{session_id}/clear")
async def clear_chat_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    user_id = str(current_user["id"])
    result = await _clear_session_records(session_id, user_id)

    return {
        "success": True,
        "session_id": session_id,
        "message": f"Session {session_id} cleared",
        "rows_removed": result["rows_removed"],
    }
