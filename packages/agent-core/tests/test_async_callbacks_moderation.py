"""Tests for async LLM callbacks + moderation."""

from __future__ import annotations

import time

from agent_core.async_callbacks import (
    AsyncCallbackDispatcher,
    LLMCallEvent,
    TurnCallbackScope,
)
from agent_core.moderation import moderate_output, score_toxicity


def test_callback_dispatcher_isolates_handler_failures():
    seen: list[str] = []

    class Boom:
        def on_event(self, event: LLMCallEvent) -> None:
            raise RuntimeError("boom")

    class Ok:
        def on_event(self, event: LLMCallEvent) -> None:
            seen.append(event.phase)

    d = AsyncCallbackDispatcher(handlers=[Boom(), Ok()])
    d.emit(LLMCallEvent(phase="start", product="test", model="m"))
    # Allow thread pool to flush
    time.sleep(0.15)
    assert "start" in seen


def test_turn_callback_scope_records_ttft():
    scope = TurnCallbackScope(product="test", model="m1")
    scope.start()
    scope.first_token()
    assert scope.ttft_ms is not None
    scope.end(prompt_tokens=10, completion_tokens=5)


def test_toxicity_blocks_slur():
    assert score_toxicity("hello world") == 0.0
    result = moderate_output("you are a faggot")
    assert result.allowed is False
    assert result.reason == "toxicity"


def test_guardrails_output_uses_moderation():
    from agent_core.guardrails import Guardrails

    g = Guardrails()
    out = g.sanitize_user_facing_output("please kill yourself now")
    assert "removed by safety" in out.lower() or out.startswith("[")
