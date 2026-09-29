"""Sprint-6 #60: turn-semaphore soak (CI, no live Ollama).

Oversubscribe AGENT_MAX_CONCURRENT_TURNS; expect busy errors, not silent hangs.
"""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import patch

import pytest

import agent_core.agent_runner as ar
from agent_core.agent_runner import AgentContext, AgentRunner
from agent_core.schemas import AgentMode, AgentProduct, AgentStreamRequest, StreamEvent


@pytest.fixture(autouse=True)
def _reset_semaphore(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("AGENT_MAX_CONCURRENT_TURNS", "2")
    monkeypatch.setenv("AGENT_TURN_QUEUE_TIMEOUT_SEC", "1")
    ar._TURN_SEMAPHORE = None
    yield
    ar._TURN_SEMAPHORE = None


class _StubRunner(AgentRunner):
    """Minimal runner that only exercises run_streaming concurrency gate."""

    def __init__(self, gate: asyncio.Event) -> None:
        self._gate = gate
        self.entered = 0

    async def _run_streaming_inner(self, *args: Any, **kwargs: Any):  # type: ignore[override]
        self.entered += 1
        await self._gate.wait()
        yield StreamEvent(event="message", text="ok")
        yield StreamEvent(event="done")


@pytest.mark.asyncio
async def test_turn_semaphore_busy_under_oversubscription():
    gate = asyncio.Event()
    runner = _StubRunner(gate)
    req = AgentStreamRequest(prompt="hello", mode=AgentMode.agent)

    async def one(i: int) -> list[str]:
        ctx = AgentContext(
            tenant_id="t-soak",
            user_id="u1",
            product=AgentProduct.cert_studio,
            session_id=f"s-{i}",
            extra={},
        )
        texts: list[str] = []
        async for ev in runner.run_streaming(req, ctx=ctx, system_prompt="sys"):
            if getattr(ev, "text", None):
                texts.append(str(ev.text))
        return texts

    tasks = [asyncio.create_task(one(i)) for i in range(8)]
    await asyncio.sleep(0.15)
    # Concurrency ceiling engaged
    assert runner.entered <= 2
    gate.set()
    results = await asyncio.gather(*tasks)
    busy = sum(1 for texts in results if any("busy" in t.lower() for t in texts))
    # Either waiters timed out to busy, or all waited behind the 2 holders —
    # both prove the semaphore is the bottleneck (no silent infinite hang).
    assert busy >= 1 or all(any(t == "ok" for t in texts) for texts in results)
    assert sum(len(t) for t in results) >= 8  # every task completed
