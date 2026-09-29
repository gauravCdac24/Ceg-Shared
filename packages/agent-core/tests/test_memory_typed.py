"""Sprint 3: typed memory tests."""

from __future__ import annotations

import json
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock


def test_memory_type_enum_has_four_values():
    from agent_core.schemas import MemoryType

    values = {m.value for m in MemoryType}
    assert values == {"episodic", "semantic", "procedural", "working"}


def test_memory_record_model():
    from agent_core.schemas import MemoryRecord, MemoryType

    r = MemoryRecord(
        memory_id="m1",
        tenant_id="t1",
        memory_type=MemoryType.PROCEDURAL,
        content="When creating quiz, always set difficulty=medium",
        created_at=datetime.now(timezone.utc),
        metadata={},
    )
    assert r.memory_type == MemoryType.PROCEDURAL
    assert r.user_id is None
    assert r.expires_at is None


def test_memory_record_working_type():
    from agent_core.schemas import MemoryRecord, MemoryType

    expires = datetime.now(timezone.utc)
    r = MemoryRecord(
        memory_id="m2",
        tenant_id="t1",
        memory_type=MemoryType.WORKING,
        content="current task scratchpad data",
        created_at=datetime.now(timezone.utc),
        expires_at=expires,
        metadata={},
    )
    assert r.memory_type == MemoryType.WORKING
    assert r.expires_at == expires


@pytest.mark.asyncio
async def test_store_working_memory_uses_redis():
    """Working memory must go to Redis, not Postgres."""
    from agent_core.memory_service import MemoryService

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.setex = AsyncMock()

    try:
        svc = MemoryService(redis_client=mock_redis)
    except TypeError:
        svc = MemoryService.__new__(MemoryService)
        svc._redis = mock_redis
        svc._fallback = None

    await svc.store_working("test task state", "tenant-123", ttl_seconds=60)

    mock_redis.setex.assert_called_once()
    call_args = mock_redis.setex.call_args
    # First positional arg should be the key
    key_arg = call_args[0][0] if call_args[0] else call_args.kwargs.get("name", "")
    assert "working_memory:tenant-123" in str(key_arg)
    # TTL arg should be 60
    ttl_arg = call_args[0][1] if len(call_args[0]) > 1 else call_args.kwargs.get("time", None)
    assert ttl_arg == 60


@pytest.mark.asyncio
async def test_retrieve_working_returns_empty_when_nothing_stored():
    from agent_core.memory_service import MemoryService

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)

    try:
        svc = MemoryService(redis_client=mock_redis)
    except TypeError:
        svc = MemoryService.__new__(MemoryService)
        svc._redis = mock_redis
        svc._fallback = None

    result = await svc.retrieve_working("tenant-456")
    assert result == []


@pytest.mark.asyncio
async def test_retrieve_working_returns_stored_items():
    from agent_core.memory_service import MemoryService

    stored = json.dumps([{"content": "step 1", "ts": "2026-06-22T00:00:00+00:00"}])
    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=stored)

    try:
        svc = MemoryService(redis_client=mock_redis)
    except TypeError:
        svc = MemoryService.__new__(MemoryService)
        svc._redis = mock_redis
        svc._fallback = None

    result = await svc.retrieve_working("tenant-789")
    assert len(result) == 1
    assert result[0]["content"] == "step 1"


@pytest.mark.asyncio
async def test_store_typed_memory_no_db_returns_id():
    """store() without a db_adapter logs warning and returns a memory_id string."""
    from agent_core.memory_service import MemoryService
    from agent_core.schemas import MemoryType

    svc = MemoryService(redis_client=None, db_adapter=None)
    memory_id = await svc.store(
        content="lesson learned",
        tenant_id="tenant-001",
        memory_type=MemoryType.PROCEDURAL,
    )
    assert isinstance(memory_id, str)
    assert len(memory_id) > 0


def test_memory_service_requires_redis_outside_local(monkeypatch):
    from agent_core.memory_service import MemoryService

    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(RuntimeError):
        MemoryService(redis_client=None)


@pytest.mark.asyncio
async def test_chat_turn_skips_embed(monkeypatch):
    """search_facts(skip_for_chat=True) must not call embed_text or hit the DB."""
    from agent_core.memory_service import MemoryService
    from agent_core.schemas import AgentProduct

    embed_mock = AsyncMock(return_value=[0.1] * 8)
    monkeypatch.setattr("agent_core.memory_service._embed_text", embed_mock)

    mock_db = MagicMock()
    mock_db.search_facts_raw = AsyncMock(return_value=[])

    svc = MemoryService(redis_client=None, db_adapter=mock_db)
    facts = await svc.search_facts(
        tenant_id="t1",
        product=AgentProduct.cert_studio,
        query="hi",
        skip_for_chat=True,
    )
    assert facts == []
    embed_mock.assert_not_called()
    mock_db.search_facts_raw.assert_not_called()
