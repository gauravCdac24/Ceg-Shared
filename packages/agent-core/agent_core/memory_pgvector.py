"""Shared pgvector helpers for product memory adapters (Phase 2)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(f"{float(x):.8f}" for x in vector) + "]"


async def pgvector_extension_available(db: AsyncSession) -> bool:
    row = await db.execute(
        text("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS ok")
    )
    return bool(row.scalar())


async def pgvector_memory_ready(db: AsyncSession) -> bool:
    """True when pgvector extension is installed and agent_memories.embedding_vec exists."""
    if not await pgvector_extension_available(db):
        return False
    row = await db.execute(
        text(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'agent_memories'
                  AND column_name = 'embedding_vec'
            ) AS ok
            """
        )
    )
    return bool(row.scalar())


def _tenant_clause(tenant_id_cast: str) -> str:
    if tenant_id_cast == "uuid":
        return "tenant_id = :tenant_id::uuid"
    return "tenant_id = :tenant_id"


async def set_embedding_vec(
    db: AsyncSession,
    *,
    row_id: str,
    embedding: list[float],
) -> None:
    vec_literal = vector_literal(embedding)
    await db.execute(
        text(
            """
            UPDATE agent_memories
            SET embedding_vec = :vec::vector
            WHERE id = :row_id
              AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
            """
        ),
        {"vec": vec_literal, "row_id": row_id},
    )


async def semantic_fact_search(
    db: AsyncSession,
    *,
    tenant_id: str | int,
    product: str,
    query_embedding: list[float],
    limit: int,
    tenant_id_cast: str = "uuid",
) -> list[dict[str, Any]]:
    vec_literal = vector_literal(query_embedding)
    tenant_sql = _tenant_clause(tenant_id_cast)
    sql = text(
        f"""
        SELECT content, meta, embedding, created_at,
               (embedding_vec <=> :query_vec::vector) AS distance
        FROM agent_memories
        WHERE {tenant_sql}
          AND product = :product
          AND content_type = 'fact'
          AND embedding_vec IS NOT NULL
        ORDER BY embedding_vec <=> :query_vec::vector
        LIMIT :lim
        """
    )
    result = await db.execute(
        sql,
        {
            "tenant_id": tenant_id,
            "product": product,
            "query_vec": vec_literal,
            "lim": limit,
        },
    )
    rows: list[dict[str, Any]] = []
    for content, meta, embedding, created_at, distance in result.fetchall():
        dist = float(distance or 1.0)
        rows.append(
            {
                "key": str((meta or {}).get("key") or ""),
                "value": content,
                "embedding": embedding,
                "created_at": created_at,
                "text_score": max(0.0, 1.0 - dist),
            }
        )
    return rows
