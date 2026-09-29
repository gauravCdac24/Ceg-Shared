from __future__ import annotations

import uuid
from unittest.mock import AsyncMock

import pytest

from agent_core.memory_service import MemoryService
from agent_core.schemas import AgentProduct, AgentSession
from agent_core.session_store import persist_session, require_owned_session


@pytest.mark.asyncio
async def test_session_survives_in_process_restart_simulation():
    memory = MemoryService()
    session = AgentSession(
        tenant_id="tenant-a",
        user_id="user-1",
        product=AgentProduct.quizforge,
    )
    await persist_session(memory, session)
    meta = await require_owned_session(
        memory,
        session_id=session.id,
        tenant_id="tenant-a",
        user_id="user-1",
        product=AgentProduct.quizforge,
    )
    assert meta["user_id"] == "user-1"


@pytest.mark.asyncio
async def test_session_list_scoped_to_tenant():
    memory = MemoryService()
    s1 = AgentSession(tenant_id="tenant-a", user_id="u1", product=AgentProduct.quizforge)
    s2 = AgentSession(tenant_id="tenant-b", user_id="u2", product=AgentProduct.quizforge)
    await persist_session(memory, s1)
    await persist_session(memory, s2)
    listed = await memory.list_sessions(product=AgentProduct.quizforge, tenant_id="tenant-a")
    assert str(s1.id) in listed
    assert str(s2.id) not in listed


@pytest.mark.asyncio
async def test_session_list_uses_scan_not_keys():
    mock_redis = AsyncMock()
    mock_redis.scan = AsyncMock(
        return_value=(
            0,
            [b"agent:session_meta:quizforge:tenant-a:s1", b"agent:session_meta:quizforge:tenant-a:s2"],
        )
    )
    memory = MemoryService(redis_client=mock_redis)

    listed = await memory.list_sessions(product=AgentProduct.quizforge, tenant_id="tenant-a")

    assert listed == ["s1", "s2"]
    mock_redis.scan.assert_called()
    mock_redis.keys.assert_not_called()
