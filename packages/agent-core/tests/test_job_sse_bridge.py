"""Tests for Celery job SSE bridge."""

from __future__ import annotations

from typing import Any

import pytest

from agent_core.job_sse_bridge import iter_agent_job_sse


class _FakeRedis:
    def __init__(self) -> None:
        self.meta: dict[str, Any] = {"status": "running"}
        self.events: list[dict[str, Any]] = []

    async def get(self, key: str) -> str | None:
        return None


@pytest.mark.asyncio
async def test_iter_agent_job_sse_drains_and_completes(monkeypatch):
    calls = {"n": 0}

    async def fake_meta(redis, job_id):
        calls["n"] += 1
        if calls["n"] >= 3:
            return {"status": "ready"}
        return {"status": "running"}

    async def fake_events(redis, job_id, start=0):
        if start == 0 and calls["n"] == 1:
            return [{"event": "token", "text": "hi"}]
        return []

    monkeypatch.setattr("agent_core.agent_job_store.aget_job_meta", fake_meta)
    monkeypatch.setattr("agent_core.agent_job_store.aget_job_events", fake_events)

    out = []
    async for ev in iter_agent_job_sse(redis=object(), job_id="j1", poll_interval_s=0.01):
        out.append(ev)

    assert out[0]["event"] == "status"
    assert any(e.get("event") == "token" for e in out)
    assert out[-1]["event"] == "done"
