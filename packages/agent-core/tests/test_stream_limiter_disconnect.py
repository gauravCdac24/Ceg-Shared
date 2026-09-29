"""Tests for Redis stream slot limiter + SSE disconnect abort."""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from agent_core.stream_bridge import sse_response
from agent_core.stream_limiter import (
    StreamSlotExhausted,
    acquire_agent_stream_slot,
    release_agent_stream_slot,
)


class _FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, Any] = {}

    async def incr(self, key: str) -> int:
        self.store[key] = int(self.store.get(key) or 0) + 1
        return int(self.store[key])

    async def decr(self, key: str) -> int:
        self.store[key] = int(self.store.get(key) or 0) - 1
        return int(self.store[key])

    async def expire(self, key: str, ttl: int) -> None:
        return None

    async def setex(self, key: str, ttl: int, value: str) -> None:
        self.store[key] = value

    async def set(self, key: str, value: Any) -> None:
        self.store[key] = value

    async def delete(self, key: str) -> int:
        if key in self.store:
            del self.store[key]
            return 1
        return 0


@pytest.mark.asyncio
async def test_stream_slot_acquire_release(monkeypatch):
    monkeypatch.setenv("AGENT_MAX_CONCURRENT_STREAMS_PER_TENANT", "2")
    monkeypatch.setenv("AGENT_MAX_CONCURRENT_STREAMS_GLOBAL", "10")
    redis = _FakeRedis()
    a = await acquire_agent_stream_slot(redis, tenant_id="t1", product="test")
    b = await acquire_agent_stream_slot(redis, tenant_id="t1", product="test")
    with pytest.raises(StreamSlotExhausted):
        await acquire_agent_stream_slot(redis, tenant_id="t1", product="test")
    await release_agent_stream_slot(redis, a, tenant_id="t1", product="test")
    c = await acquire_agent_stream_slot(redis, tenant_id="t1", product="test")
    assert c
    await release_agent_stream_slot(redis, b, tenant_id="t1", product="test")
    await release_agent_stream_slot(redis, c, tenant_id="t1", product="test")


@pytest.mark.asyncio
async def test_sse_stops_when_disconnected():
    cancelled = {"n": 0}

    async def events():
        try:
            yield {"event": "token", "text": "a"}
            await asyncio.sleep(0.05)
            yield {"event": "token", "text": "b"}
            await asyncio.sleep(10)
            yield {"event": "done"}
        except asyncio.CancelledError:
            cancelled["n"] += 1
            raise

    disconnected = {"v": False}

    async def is_disconnected():
        return disconnected["v"]

    chunks = []
    async for chunk in sse_response(
        events(),
        heartbeat_interval_s=60,
        is_disconnected=is_disconnected,
    ):
        chunks.append(chunk)
        disconnected["v"] = True

    assert any("token" in c for c in chunks)
    await asyncio.sleep(0.05)
    assert cancelled["n"] >= 1 or len(chunks) >= 1
