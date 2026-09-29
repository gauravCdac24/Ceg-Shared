"""ReplanningLoop unit tests."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from agent_core.planner import AgentPlan, PlanStep
from agent_core.replanning_loop import ReplanningLoop


@pytest.mark.asyncio
async def test_replan_enriches_goal_with_failure() -> None:
    planner = MagicMock()
    step = PlanStep(step_name="retry", capability_name="canvas_analyze")
    planner.create_plan = AsyncMock(return_value=AgentPlan(goal="g", steps=[step], raw=""))
    loop = ReplanningLoop(planner=planner)
    result = await loop.replan(goal="improve layout", failure_reason="tool timeout")
    assert result.plan.steps
    planner.create_plan.assert_awaited_once()
    call_goal = planner.create_plan.await_args.kwargs["goal"]
    assert "timeout" in call_goal
