"""Replan when execution or verification fails."""

from __future__ import annotations

from dataclasses import dataclass

import structlog

from agent_core.planner import AgentPlan, Planner

log = structlog.get_logger(__name__)


@dataclass
class ReplanResult:
    plan: AgentPlan
    reason: str


class ReplanningLoop:
    def __init__(self, *, planner: Planner) -> None:
        self._planner = planner

    async def replan(
        self,
        *,
        goal: str,
        failure_reason: str,
        context: dict | None = None,
    ) -> ReplanResult:
        enriched_goal = f"{goal}\n\nPrevious attempt failed because: {failure_reason[:500]}"
        plan = await self._planner.create_plan(goal=enriched_goal, context=context)
        log.info("agent_replan_created", reason=failure_reason[:120], steps=len(plan.steps))
        return ReplanResult(plan=plan, reason=failure_reason)
