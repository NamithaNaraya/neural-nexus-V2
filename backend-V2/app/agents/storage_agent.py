"""
Storage Agent - Persistence Layer for the Ingestion Pipeline

Handles all database writes:
- Neo4j (graph structure)
- PostgreSQL (audit logs, file metadata)
"""
import json
import logging
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Tuple

from sqlalchemy import text

from app.db.connections import get_neo4j_driver, get_postgres_session
from app.db.neo4j_utils import sanitize_relationship_type

logger = logging.getLogger(__name__)


class StorageAgent:
    """
    Storage Agent for the Knowledge Graph Pipeline.
    
    Handles:
    - Neo4j entity and relationship creation
    - PostgreSQL audit logging
    - Reference counting for shared entities
    """
    
    def __init__(self):
        pass
        
    async def store_entities(
        self,
        entities: List[Any],
        file_id: str,
        folder_id: str,
        user_id: str,
        tx: Any = None,
    ) -> Dict[str, str]:
        """
        Store entities in Neo4j using UNWIND batching.
        
        Args:
            entities: List of validated entities
            file_id: Source file ID
            folder_id: Folder ID for scoping
            user_id: User ID for ownership
            tx: Optional active Neo4j transaction
            
        Returns:
            Mapping of entity IDs to Neo4j node IDs
        """
        logger.info(f"🚀 Storing {len(entities)} entities to Neo4j using batch query")
        
        driver = get_neo4j_driver()
        entity_id_map = {}
        
        if not entities:
            return entity_id_map
        
        def get_value(obj, key, default=None):
            """Safely get value from dict or dataclass."""
            if isinstance(obj, dict):
                return obj.get(key, default)
            elif hasattr(obj, key):
                return getattr(obj, key, default)
            return default
        
        # Prepare batch data - extract all entity data upfront
        batch_entities = []
        for entity in entities:
            try:
                entity_dict = {
                    'input_id': get_value(entity, 'id', str(uuid.uuid4())),
                    'name': get_value(entity, 'name', ''),
                    'type': get_value(entity, 'type', 'Concept'),
                    'description': get_value(entity, 'description', ''),
                    'properties': json.dumps(get_value(entity, 'properties', {})) or '{}',
                    'embedding': get_value(entity, 'embedding', None),
                    'source_text': get_value(entity, 'source_text', ''),
                    'confidence': float(get_value(entity, 'confidence', 1.0)),
                }
                batch_entities.append(entity_dict)
            except Exception as e:
                logger.error(f"Failed to prepare entity for batch: {e}", exc_info=True)
                continue
        
        if not batch_entities:
            logger.warning("No entities to store after preparation")
            return entity_id_map
        
        async def _run_batch(runner):
            result = await runner.run("""
                UNWIND $entities AS entity
                MERGE (e:Entity {
                    name: entity.name,
                    type: entity.type,
                    folder_id: $folder_id
                })
                ON CREATE SET
                    e.id = entity.input_id,
                    e.description = entity.description,
                    e.properties = entity.properties,
                    e.embedding = entity.embedding,
                    e.source_text = entity.source_text,
                    e.confidence = entity.confidence,
                    e.user_id = $user_id,
                    e.file_ids = [$file_id],
                    e.created_at = datetime(),
                    e.source_count = 1
                ON MATCH SET
                    e.file_ids = CASE 
                        WHEN NOT $file_id IN e.file_ids 
                        THEN e.file_ids + $file_id 
                        ELSE e.file_ids 
                    END,
                    e.source_count = size(e.file_ids),
                    e.updated_at = datetime()
                RETURN entity.input_id AS input_id, e.id AS node_id
            """,
                entities=batch_entities,
                folder_id=folder_id,
                user_id=user_id,
                file_id=file_id,
            )
            records = await result.data()
            for record in records:
                entity_id_map[record["input_id"]] = record["node_id"]
            logger.info(f"✅ Batch stored {len(entity_id_map)} entities in single query")

        try:
            if tx:
                await _run_batch(tx)
            else:
                async with driver.session() as session:
                    await _run_batch(session)
        except Exception as e:
            logger.error(f"❌ Failed to store entities batch: {e}", exc_info=True)
            raise
        
        return entity_id_map
    
    async def store_relationships(
        self,
        relationships: List[Any],
        entity_id_map: Dict[str, str],
        file_id: str,
        folder_id: str,
        tx: Any = None,
    ) -> int:
        """
        Store relationships in Neo4j using UNWIND batching.
        
        Args:
            relationships: List of validated relationships
            entity_id_map: Mapping of entity IDs to Neo4j node IDs
            file_id: Source file ID
            folder_id: Folder ID for scoping
            tx: Optional active Neo4j transaction
            
        Returns:
            Number of relationships created
        """
        logger.info(f"🚀 Storing {len(relationships)} relationships to Neo4j using batch query")
        
        driver = get_neo4j_driver()
        
        if not relationships:
            logger.info("No relationships to store")
            return 0
        
        def get_value(obj, key, default=None):
            """Safely get value from dict or dataclass."""
            if isinstance(obj, dict):
                return obj.get(key, default)
            elif hasattr(obj, key):
                return getattr(obj, key, default)
            return default
        
        # Prepare batch data - extract all relationship data upfront
        batch_rels = []
        for rel in relationships:
            try:
                source_id = get_value(rel, 'source_entity_id')
                target_id = get_value(rel, 'target_entity_id')
                rel_type = get_value(rel, 'type') or get_value(rel, 'relationship_type', 'RELATED_TO')
                
                rel_dict = {
                    'source_id': entity_id_map.get(source_id, source_id),
                    'target_id': entity_id_map.get(target_id, target_id),
                    'type': sanitize_relationship_type(rel_type),
                    'description': get_value(rel, 'description', ''),
                    'strength': float(get_value(rel, 'strength', 1.0)),
                    'source_text': get_value(rel, 'source_text', ''),
                    'confidence': float(get_value(rel, 'confidence', 1.0)),
                }
                batch_rels.append(rel_dict)
            except Exception as e:
                logger.error(f"Failed to prepare relationship for batch: {e}", exc_info=True)
                continue
        
        if not batch_rels:
            logger.warning("No relationships to store after preparation")
            return 0
        
        # Group by relationship type to use typed MERGE (more efficient)
        rels_by_type = {}
        for rel in batch_rels:
            rel_type = rel['type']
            if rel_type not in rels_by_type:
                rels_by_type[rel_type] = []
            rels_by_type[rel_type].append(rel)
        
        async def _run_batch(runner):
            total_created = 0
            for rel_type, type_rels in rels_by_type.items():
                try:
                    query = f"""
                        UNWIND $relationships AS rel
                        MATCH (source:Entity {{id: rel.source_id, folder_id: $folder_id}})
                        MATCH (target:Entity {{id: rel.target_id, folder_id: $folder_id}})
                        MERGE (source)-[r:{rel_type}]->(target)
                        ON CREATE SET
                            r.description = rel.description,
                            r.strength = rel.strength,
                            r.source_text = rel.source_text,
                            r.confidence = rel.confidence,
                            r.file_ids = [$file_id],
                            r.created_at = datetime()
                        ON MATCH SET
                            r.file_ids = CASE 
                                WHEN NOT $file_id IN r.file_ids 
                                THEN r.file_ids + $file_id 
                                ELSE r.file_ids 
                            END,
                            r.updated_at = datetime()
                        RETURN count(*) AS created
                    """
                    
                    result = await runner.run(
                        query,
                        relationships=type_rels,
                        folder_id=folder_id,
                        file_id=file_id,
                    )
                    
                    record = await result.single()
                    created = record["created"] if record else 0
                    total_created += created
                    logger.debug(f"Batch created {created} {rel_type} relationships")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to store {rel_type} relationships batch: {e}", exc_info=True)
                    if tx:
                        raise # Bubble up if in transaction to rollback
                    continue
            return total_created
            
        if tx:
            total_created = await _run_batch(tx)
        else:
            async with driver.session() as session:
                total_created = await _run_batch(session)
        
        logger.info(f"✅ Batch stored {total_created} relationships across {len(rels_by_type)} types")
        return total_created
    
    async def store_chunks(
        self,
        chunks: List[Any],
        file_id: str,
        folder_id: str,
        tx: Any = None,
    ) -> int:
        """
        Store text chunks in Neo4j using UNWIND batching.
        
        Args:
            chunks: List of text chunks with embeddings
            file_id: Source file ID
            folder_id: Folder ID
            tx: Optional active Neo4j transaction
            
        Returns:
            Number of chunks stored
        """
        logger.info(f"🚀 Storing {len(chunks)} chunks to Neo4j using batch query")
        
        driver = get_neo4j_driver()
        
        if not chunks:
            return 0
        
        def get_value(obj, key, default=None):
            """Safely get value from dict or dataclass."""
            if isinstance(obj, dict):
                return obj.get(key, default)
            elif hasattr(obj, key):
                return getattr(obj, key, default)
            return default
        
        # Prepare batch data - extract all chunk data upfront
        batch_chunks = []
        for chunk in chunks:
            try:
                chunk_dict = {
                    'chunk_id': get_value(chunk, 'chunk_id', str(uuid.uuid4())),
                    'content': get_value(chunk, 'content', ''),
                    'embedding': get_value(chunk, 'embedding', None),
                    'section_type': get_value(chunk, 'section_type', 'paragraph'),
                    'section_title': get_value(chunk, 'section_title', None),
                    'start_position': int(get_value(chunk, 'start_position', 0)),
                    'end_position': int(get_value(chunk, 'end_position', 0)),
                }
                batch_chunks.append(chunk_dict)
            except Exception as e:
                logger.error(f"Failed to prepare chunk for batch: {e}", exc_info=True)
                continue
        
        if not batch_chunks:
            logger.warning("No chunks to store after preparation")
            return 0
        
        async def _run_batch(runner):
            result = await runner.run("""
                UNWIND $chunks AS chunk
                CREATE (c:Chunk {
                    id: chunk.chunk_id,
                    content: chunk.content,
                    embedding: chunk.embedding,
                    section_type: chunk.section_type,
                    section_title: chunk.section_title,
                    start_position: chunk.start_position,
                    end_position: chunk.end_position,
                    file_id: $file_id,
                    folder_id: $folder_id,
                    created_at: datetime()
                })
                RETURN count(*) AS stored
            """,
                chunks=batch_chunks,
                file_id=file_id,
                folder_id=folder_id,
            )
            record = await result.single()
            return record["stored"] if record else 0

        try:
            if tx:
                stored_count = await _run_batch(tx)
            else:
                async with driver.session() as session:
                    stored_count = await _run_batch(session)
            
            logger.info(f"✅ Batch stored {stored_count} chunks in single query")
            return stored_count
            
        except Exception as e:
            logger.error(f"❌ Failed to store chunks batch: {e}", exc_info=True)
            raise
    
    async def update_file_status(
        self,
        file_id: str,
        status: str,
        node_count: int = 0,
        relationship_count: int = 0,
        error_message: str = None,
    ) -> None:
        """
        Update file processing status in PostgreSQL.
        
        Args:
            file_id: File ID to update
            status: New status ('processing', 'ready_for_review', 'completed', 'failed')
            node_count: Number of nodes created
            relationship_count: Number of relationships created
            error_message: Error message if failed
        """
        async with get_postgres_session() as session:
            await session.execute(
                text("""
                    UPDATE neural_nexus.files 
                    SET status = :status,
                        node_count = :node_count,
                        relationship_count = :relationship_count,
                        error_message = :error_message,
                        processed_at = :processed_at
                    WHERE id = :file_id
                """),
                {
                    "file_id": file_id,
                    "status": status,
                    "node_count": node_count,
                    "relationship_count": relationship_count,
                    "error_message": error_message,
                    "processed_at": datetime.utcnow() if status in ['completed', 'failed'] else None,
                }
            )
            await session.commit()
        
        logger.info(f"Updated file {file_id} status to {status}")
    
    async def create_audit_log(
        self,
        user_id: str,
        action: str,
        target_type: str,
        target_id: str,
        details: Dict[str, Any] = None,
    ) -> None:
        """
        Create an audit log entry in PostgreSQL.
        
        Args:
            user_id: User who performed the action
            action: Action type (e.g., 'create', 'update', 'delete')
            target_type: Type of entity affected
            target_id: ID of affected entity
            details: Additional context
        """
        async with get_postgres_session() as session:
            await session.execute(
                text("""
                    INSERT INTO neural_nexus.audit_logs 
                    (user_id, action, target_type, target_id, new_value, timestamp)
                    VALUES (:user_id, :action, :target_type, :target_id, :details, :timestamp)
                """),
                {
                    "user_id": user_id,
                    "action": action,
                    "target_type": target_type,
                    "target_id": target_id,
                    "details": json.dumps(details) if details else None,
                    "timestamp": datetime.utcnow(),
                }
            )
            await session.commit()

    async def store_staging(
        self,
        file_id: str,
        entities: List[Any],
        relationships: List[Any],
    ) -> None:
        """
        Store extracted data in staging table.
        """
        # Convert entities/relationships to serializable format
        entity_dicts = []
        for e in entities:
            if hasattr(e, "model_dump"):
                entity_dicts.append(e.model_dump())
            elif hasattr(e, "__dict__"):
                entity_dicts.append({k: v for k, v in e.__dict__.items() if not k.startswith("_")})
            else:
                entity_dicts.append(e)

        rel_dicts = []
        for r in relationships:
            if hasattr(r, "model_dump"):
                rel_dicts.append(r.model_dump())
            elif hasattr(r, "__dict__"):
                rel_dicts.append({k: v for k, v in r.__dict__.items() if not k.startswith("_")})
            else:
                rel_dicts.append(r)

        async with get_postgres_session() as session:
            # Check if exists (upsert)
            result = await session.execute(
                text("SELECT id FROM neural_nexus.entity_staging WHERE file_id = :file_id"),
                {"file_id": file_id}
            )
            exists = result.fetchone()

            if exists:
                await session.execute(
                    text("""
                        UPDATE neural_nexus.entity_staging 
                        SET entity_data = :entity_data, 
                            relationship_data = :relationship_data,
                            created_at = :created_at
                        WHERE file_id = :file_id
                    """),
                    {
                        "file_id": file_id,
                        "entity_data": json.dumps(entity_dicts),
                        "relationship_data": json.dumps(rel_dicts),
                        "created_at": datetime.utcnow(),
                    }
                )
            else:
                await session.execute(
                    text("""
                        INSERT INTO neural_nexus.entity_staging 
                        (id, file_id, entity_data, relationship_data, created_at)
                        VALUES (:id, :file_id, :entity_data, :relationship_data, :created_at)
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "file_id": file_id,
                        "entity_data": json.dumps(entity_dicts),
                        "relationship_data": json.dumps(rel_dicts),
                        "created_at": datetime.utcnow(),
                    }
                )
            await session.commit()
        
        logger.info(f"Stored {len(entities)} entities and {len(relationships)} relationships in staging for file {file_id}")
        # Debug: log first entity to verify format
        if entity_dicts:
            logger.info(f"[STAGING DEBUG] Sample entity: {entity_dicts[0].get('name', 'N/A')} ({entity_dicts[0].get('type', 'N/A')})")

    async def get_staging(self, file_id: str) -> Dict[str, List]:
        """Fetch staging data for a file."""
        async with get_postgres_session() as session:
            result = await session.execute(
                text("SELECT entity_data, relationship_data FROM neural_nexus.entity_staging WHERE file_id = :file_id"),
                {"file_id": file_id}
            )
            row = result.fetchone()
            if not row:
                logger.warning(f"[GET_STAGING DEBUG] No staging data found for file {file_id}")
                return {"entities": [], "relationships": []}
            
            entities = json.loads(row.entity_data) if isinstance(row.entity_data, str) else row.entity_data
            relationships = json.loads(row.relationship_data) if isinstance(row.relationship_data, str) else row.relationship_data
            
            logger.info(f"[GET_STAGING DEBUG] Retrieved {len(entities)} entities and {len(relationships)} relationships for file {file_id}")
            
            return {
                "entities": entities,
                "relationships": relationships,
            }

