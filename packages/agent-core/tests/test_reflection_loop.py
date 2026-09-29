"""ReflectionLoop unit tests."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from agent_core.critic import CriticVerdict
from agent_core.reflection_loop import ReflectionLoop


@pytest.mark.asyncio
async def test_reflect_suggests_retry_when_critic_rejects() -> None:
    llm = MagicMock()
    router = MagicMock()
    loop = ReflectionLoop(llm=llm, router=router)
    loop._critic.verify = AsyncMock(  # noqa: SLF001
        return_value=CriticVerdict(
            approved=False,
            issues=["missing preview"],
            suggestion="Add preview step",
            raw={},
        )
    )
    result = await loop.reflect(user_goal="edit title", agent_response="done", retry_count=0)
    assert result.should_retry is True
    assert "preview" in result.improved_hint.lower()


@pytest.mark.asyncio
async def test_reflect_no_retry_when_approved() -> None:
    llm = MagicMock()
    router = MagicMock()
    loop = ReflectionLoop(llm=llm, router=router)
    loop._critic.verify = AsyncMock(  # noqa: SLF001
        return_value=CriticVerdict(approved=True, issues=[], suggestion="", raw={})
    )
    result = await loop.reflect(user_goal="hi", agent_response="hello!", retry_count=0)
    assert result.should_retry is False
