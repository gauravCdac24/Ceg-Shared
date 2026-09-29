"""Chat fast-path: no critic/reflection on conversational turns."""

from __future__ import annotations

from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, patch

import pytest

from agent_core.agent_runner import AgentContext, AgentRunner
from agent_core.guardrails import Guardrails
from agent_core.memory_service import MemoryService
from agent_core.model_router import ModelRouter
from agent_core.ollama_client import OllamaClient
from agent_core.prompt_builder import PromptBuilder
from agent_core.query_preprocessor import PreprocessedQuery, TaskIntent
from agent_core.schemas import AgentConfig, AgentProduct, AgentStreamRequest
from agent_core.tool_registry import ToolRegistry
from agent_core.turn_router import ConversationState, RoutingDecision


class MockOllama(OllamaClient):
    def __init__(self) -> None:
        super().__init__(base_url="http://mock")

    async def stream_chat(self, **kwargs) -> AsyncIterator[str]:
        del kwargs
        for ch in "Hello!":
            yield ch


def _chat_routing() -> RoutingDecision:
    return RoutingDecision(
        state=ConversationState.chat,
        intent=TaskIntent.conversational,
        confidence=0.98,
        path="chat",
        reason="test",
        preprocessed=PreprocessedQuery(
            original="hi",
            rewritten="hi",
            intent=TaskIntent.conversational,
            confidence=0.98,
            suggested_mode="ask",
        ),
    )


@pytest.mark.asyncio
async def test_chat_turn_skips_critic_reflect():
    runner = AgentRunner(
        registry=ToolRegistry(),
        llm=MockOllama(),
        router=ModelRouter(
            platform_default="qwen2.5:3b",
            platform_fast="qwen2.5:1.5b",
            platform_json="qwen2.5:1.5b",
        ),
        memory=MemoryService(),
        guardrails=Guardrails(),
        prompt_builder=PromptBuilder(),
        config=AgentConfig(product=AgentProduct.cert_studio, persona="Full persona"),
    )
    ctx = AgentContext(
        tenant_id="t1",
        user_id="u1",
        product=AgentProduct.cert_studio,
        session_id="sess-chat",
    )
    with patch.object(runner._reflection, "reflect", new_callable=AsyncMock) as mock_reflect:
        events = []
        async for ev in runner.run_streaming(
            AgentStreamRequest(prompt="hi"),
            ctx=ctx,
            system_prompt="Full Cleo persona should not matter for chat path.",
            routing_decision=_chat_routing(),
        ):
            events.append(ev)
        mock_reflect.assert_not_called()
    assert any(e.event == "message" for e in events)
    assert events[-1].event == "done"
