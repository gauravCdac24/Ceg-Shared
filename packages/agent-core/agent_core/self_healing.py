"""Self-healing: diagnose failures, suggest repairs, track rollbacks."""

from __future__ import annotations

from dataclasses import dataclass, field

import structlog

from agent_core.critic import Critic
from agent_core.executor import ToolExecutionResult
from agent_core.recovery_loop import RecoveryLoop, RecoveryPlan
from agent_core.replanning_loop import ReplanningLoop

log = structlog.get_logger(__name__)


@dataclass
class HealingOutcome:
    recovery: RecoveryPlan
    should_replan: bool
    critic_approved: bool | None = None
    rollback_tools: list[str] = field(default_factory=list)


class SelfHealing:
    """Detect tool/LLM failures, diagnose, and coordinate recovery + critic validation."""

    DESTRUCTIVE_TOOLS = frozenset(
        {
            "create_end_to_end_workflow",
            "delete_all",
            "bulk_delete",
            "purge_tenant_data",
        }
    )

    def __init__(
        self,
        *,
        recovery: RecoveryLoop | None = None,
        critic: Critic | None = None,
        replanner: ReplanningLoop | None = None,
    ) -> None:
        self._recovery = recovery or RecoveryLoop()
        self._critic = critic
        self._replanner = replanner

    def tools_requiring_confirmation(self, tool_names: set[str]) -> set[str]:
        return {name for name in tool_names if name in self.DESTRUCTIVE_TOOLS}

    async def heal_tool_batch(
        self,
        results: list[ToolExecutionResult],
        *,
        user_goal: str = "",
        agent_draft: str = "",
    ) -> HealingOutcome:
        recovery = self._recovery.diagnose(results)
        should_replan = any(a.kind == "tool_failed" for a in recovery.actions) and len(
            recovery.actions
        ) >= 2
        critic_approved = None
        if self._critic and user_goal and agent_draft:
            verdict = await self._critic.verify(
                user_goal=user_goal,
                agent_response=agent_draft,
                tool_summary="\n".join(r.result[:200] for r in results),
            )
            critic_approved = verdict.approved
        log.info(
            "self_healing_outcome",
            should_replan=should_replan,
            rollback=len(recovery.rollback_ids),
        )
        return HealingOutcome(
            recovery=recovery,
            should_replan=should_replan,
            critic_approved=critic_approved,
            rollback_tools=list(recovery.rollback_ids),
        )
