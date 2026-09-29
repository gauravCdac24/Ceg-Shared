"""Tenant isolation for semantic memory recall."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import JSON, DateTime, String, Text, Uuid
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from agent_core.memory_adapter_helpers import search_facts_raw_pgvector
from agent_core.schemas import AgentProduct


class _Base(DeclarativeBase):
    pass


class _MemoryModel(_Base):
    __tablename__ = "agent_memories_test"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    product: Mapped[str] = mapped_column(String(64), nullable=False)
    content_type: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)


@pytest.mark.asyncio
async def test_search_facts_raw_filters_by_tenant(monkeypatch: pytest.MonkeyPatch) -> None:
    tenant_a = uuid.UUID("00000000-0000-4000-8000-000000000001")
    tenant_b = uuid.UUID("00000000-0000-4000-8000-000000000002")

    async def fake_ready(_db: AsyncSession) -> bool:
        return False

    async def fake_embed(_text: str) -> list[float]:
        return [0.1, 0.2, 0.3]

    monkeypatch.setattr("agent_core.memory_adapter_helpers.pgvector_memory_ready", fake_ready)
    monkeypatch.setattr("agent_core.embedding_service.embed_text", fake_embed)

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(_Base.metadata.create_all)

    async with session_factory() as db:
        now = datetime.now(timezone.utc)
        db.add_all(
            [
                _MemoryModel(
                    id=uuid.uuid4(),
                    tenant_id=tenant_a,
                    product=AgentProduct.cert_studio.value,
                    content_type="fact",
                    content="brand color tenant-a-blue",
                    meta={"key": "brand_color"},
                    created_at=now,
                    embedding=None,
                ),
                _MemoryModel(
                    id=uuid.uuid4(),
                    tenant_id=tenant_b,
                    product=AgentProduct.cert_studio.value,
                    content_type="fact",
                    content="brand color tenant-b-green",
                    meta={"key": "brand_color"},
                    created_at=now,
                    embedding=None,
                ),
            ]
        )
        await db.commit()

        rows_a = await search_facts_raw_pgvector(
            db,
            memory_model=_MemoryModel,
            tenant_id=str(tenant_a),
            product=AgentProduct.cert_studio,
            query="brand color",
            limit=5,
        )
        rows_b = await search_facts_raw_pgvector(
            db,
            memory_model=_MemoryModel,
            tenant_id=str(tenant_b),
            product=AgentProduct.cert_studio,
            query="brand color",
            limit=5,
        )

    await engine.dispose()

    assert rows_a and rows_a[0]["value"] == "brand color tenant-a-blue"
    assert rows_b and rows_b[0]["value"] == "brand color tenant-b-green"
    assert rows_a[0]["value"] != rows_b[0]["value"]
