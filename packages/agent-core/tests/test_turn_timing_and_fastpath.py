"""Tests for turn timing + expanded deterministic routing (WL-071 / WL-074)."""

from __future__ import annotations

import asyncio
import time

import pytest

from agent_core.query_preprocessor import TaskIntent
from agent_core.turn_router import ConversationState, TurnRouter
from agent_core.turn_timing import TurnTiming


def test_turn_timing_fields() -> None:
    t = TurnTiming()
    t.mark_preflight()
    time.sleep(0.01)
    t.mark_route()
    t.mark_memory(time.perf_counter() - 0.005)
    t.mark_first_token()
    t.path = "chat"
    t.intent = "conversational"
    fields = t.as_log_fields()
    assert fields["t_preflight_ms"] is not None
    assert fields["t_route_ms"] is not None
    assert fields["t_first_token_ms"] is not None
    assert fields["t_total_ms"] >= fields["t_first_token_ms"]
    assert "prompt" not in fields  # no PII bodies


@pytest.mark.asyncio
async def test_color_tweak_skips_preprocessor() -> None:
    """WL-074: layout/color tweaks must not call LLM preprocess."""

    class Boom:
        async def preprocess(self, *a, **k):  # pragma: no cover
            raise AssertionError("preprocessor must not run")

    decision = await TurnRouter(preprocessor=Boom()).route(  # type: ignore[arg-type]
        "make it more blue",
        ctx={"product_context": "cert_studio"},
    )
    assert decision.path == "agent"
    assert decision.intent == TaskIntent.edit
    assert decision.reason == "deterministic_edit"
    assert decision.confidence >= 0.9


@pytest.mark.asyncio
async def test_what_can_you_do_still_chat() -> None:
    decision = await TurnRouter(preprocessor=None).route("what can you do?")
    assert decision.path == "chat"
    assert decision.state == ConversationState.chat


@pytest.mark.asyncio
async def test_sse_heartbeat_while_waiting() -> None:
    from agent_core.stream_bridge import sse_response

    async def slow():
        await asyncio.sleep(0.25)
        yield {"event": "done"}

    chunks = []
    async for c in sse_response(slow(), heartbeat_interval_s=0.05):
        chunks.append(c)
    assert any("heartbeat" in c for c in chunks)
    assert any("done" in c for c in chunks)
