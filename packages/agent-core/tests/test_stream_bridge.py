from __future__ import annotations

import json
from contextvars import ContextVar

import pytest

from agent_core.stream_bridge import format_sse, sse_response


def test_format_sse_valid_json():
    payload = format_sse({"event": "token", "text": "hi"})
    assert payload.startswith("data: ")
    assert payload.endswith("\n\n")
    data = json.loads(payload.removeprefix("data: ").strip())
    assert data["event"] == "token"


@pytest.mark.asyncio
async def test_sse_response_iterator():
    async def events():
        yield {"event": "done"}

    chunks = []
    async for chunk in sse_response(events()):
        chunks.append(chunk)
    assert len(chunks) == 1
    assert "done" in chunks[0]


@pytest.mark.asyncio
async def test_sse_response_preserves_iterator_context():
    turn: ContextVar[str] = ContextVar("turn", default="")

    async def events():
        token = turn.set("active")
        try:
            yield {"event": "token", "text": turn.get()}
            yield {"event": "done"}
        finally:
            turn.reset(token)

    chunks = []
    async for chunk in sse_response(events(), heartbeat_interval_s=60):
        chunks.append(chunk)

    assert len(chunks) == 2
    assert json.loads(chunks[0].removeprefix("data: ").strip())["text"] == "active"
