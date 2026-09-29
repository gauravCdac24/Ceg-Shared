from __future__ import annotations

from collections.abc import AsyncIterator

import pytest

from agent_core.critic import Critic
from agent_core.model_router import ModelRouter
from agent_core.ollama_client import OllamaClient
from agent_core.planner import Planner


class StubLlm(OllamaClient):
    def __init__(self, *, chat_text: str = "", json_payload: dict | None = None) -> None:
        super().__init__(base_url="http://stub")
        self._chat_text = chat_text
        self._json_payload = json_payload or {"approved": True, "issues": [], "suggestion": ""}

    async def stream_chat(self, **kwargs) -> AsyncIterator[str]:
        for ch in self._chat_text:
            yield ch

    async def chat(self, **kwargs) -> str:
        return self._chat_text

    async def chat_json(self, **kwargs) -> dict:
        return self._json_payload


@pytest.mark.asyncio
async def test_planner_parses_steps():
    llm = StubLlm(chat_text="[STEP 1] Do A\n[STEP 2] Do B\n[PLAN_COMPLETE]")
    planner = Planner(llm=llm, router=ModelRouter(platform_default="m", platform_fast="f", platform_json="j"))
    plan = await planner.create_plan(goal="build quiz")
    assert len(plan.steps) == 2
    assert plan.steps[0].text == "Do A"


@pytest.mark.asyncio
async def test_critic_verdict():
    llm = StubLlm(json_payload={"approved": False, "issues": ["missing detail"], "suggestion": "add steps"})
    critic = Critic(llm=llm, router=ModelRouter(platform_default="m", platform_fast="f", platform_json="j"))
    verdict = await critic.verify(user_goal="help", agent_response="ok", tool_summary="")
    assert not verdict.approved
    assert verdict.issues


@pytest.mark.asyncio
async def test_critic_fails_closed_on_llm_error():
    class FailingLlm(StubLlm):
        async def chat_json(self, **kwargs) -> dict:
            raise RuntimeError("ollama down")

    critic = Critic(llm=FailingLlm(), router=ModelRouter(platform_default="m", platform_fast="f", platform_json="j"))
    verdict = await critic.verify(user_goal="help", agent_response="ok", tool_summary="")
    assert not verdict.approved
    assert verdict.skip_reason == "critic_unavailable"


@pytest.mark.asyncio
async def test_critic_fail_closed_on_llm_error():
    class FailingLlm(StubLlm):
        async def chat_json(self, **kwargs) -> dict:
            raise RuntimeError("ollama down")

    critic = Critic(llm=FailingLlm(), router=ModelRouter(platform_default="m", platform_fast="f", platform_json="j"))
    verdict = await critic.verify(user_goal="help", agent_response="ok", tool_summary="")
    assert not verdict.approved
    assert verdict.skip_reason == "critic_unavailable"
