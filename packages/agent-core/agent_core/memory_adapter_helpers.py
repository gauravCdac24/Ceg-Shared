"""Reusable pgvector memory search mixin logic for product adapters."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agent_core.memory_pgvector import (
    pgvector_memory_ready,
    semantic_fact_search,
    set_embedding_vec,
)
from agent_core.schemas import AgentProduct


async def store_fact_with_embedding(
    db: AsyncSession,
    *,
    row: Any,
    embedding: list[float] | None,
) -> None:
    db.add(row)
    await db.commit()
    if embedding:
        try:
            await set_embedding_vec(db, row_id=str(row.id), embedding=embedding)
            await db.commit()
        except Exception:
            await db.rollback()


async def search_facts_raw_pgvector(
    db: AsyncSession,
    *,
    memory_model: Any,
    tenant_id: str,
    product: AgentProduct,
    query: str,
    limit: int,
    tenant_id_cast: str = "uuid",
    tenant_filter_value: Any | None = None,
) -> list[dict[str, Any]]:
    snippet = (query or "").strip()[:200]
    if not snippet:
        return []

    tid_value = tenant_filter_value
    if tid_value is None:
        tid_value = int(tenant_id) if tenant_id_cast == "int" else tenant_id

    query_embedding: list[float] | None = None
    try:
        from agent_core.embedding_service import embed_text

        query_embedding = await embed_text(snippet)
    except ImportError:
        query_embedding = None

    if query_embedding and await pgvector_memory_ready(db):
        try:
            semantic = await semantic_fact_search(
                db,
                tenant_id=tid_value,
                product=product.value,
                query_embedding=query_embedding,
                limit=limit,
                tenant_id_cast=tenant_id_cast,
            )
            if semantic:
                return semantic
        except Exception:
            await db.rollback()

    pattern = f"%{snippet}%"
    tenant_col = memory_model.tenant_id
    if tenant_id_cast == "int":
        tenant_eq = tenant_col == int(tenant_id)
    else:
        tenant_eq = tenant_col == uuid.UUID(tenant_id)

    try:
        result = await db.execute(
            select(memory_model)
            .where(
                tenant_eq,
                memory_model.product == product.value,
                memory_model.content_type == "fact",
                memory_model.content.ilike(pattern),
            )
            .order_by(memory_model.created_at.desc())
            .limit(limit)
        )
        rows = result.scalars().all()
    except Exception:
        await db.rollback()
        return []

    return [
        {
            "key": str((r.meta or {}).get("key") or ""),
            "value": r.content,
            "embedding": r.embedding,
            "created_at": r.created_at,
            "text_score": 0.55,
        }
        for r in rows
    ]
