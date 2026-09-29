"""Recovery actions after tool or LLM failures."""

from __future__ import annotations

from dataclasses import dataclass, field

import structlog

from agent_core.executor import ToolExecutionResult

log = structlog.get_logger(__name__)


@dataclass
class RecoveryAction:
    kind: str
    message: str
    retry_allowed: bool = True


@dataclass
class RecoveryPlan:
    actions: list[RecoveryAction] = field(default_factory=list)
    rollback_ids: list[str] = field(default_factory=list)
    hint_for_llm: str = ""


class RecoveryLoop:
    def diagnose(self, tool_results: list[ToolExecutionResult]) -> RecoveryPlan:
        actions: list[RecoveryAction] = []
        rollback: list[str] = []
        hints: list[str] = []
        for result in tool_results:
            if result.ok:
                continue
            if result.denied:
                actions.append(
                    RecoveryAction(
                        kind="tool_denied",
                        message=f"{result.name} is not allowed in this mode.",
                        retry_allowed=False,
                    )
                )
                hints.append(f"Do not call {result.name}; choose an allowed alternative.")
            elif result.error == "timeout":
                actions.append(
                    RecoveryAction(
                        kind="tool_timeout",
                        message=f"{result.name} timed out.",
                        retry_allowed=True,
                    )
                )
                hints.append(f"Retry {result.name} with simpler arguments or skip it.")
            elif result.error == "confirmation_required":
                actions.append(
                    RecoveryAction(
                        kind="confirmation_required",
                        message=f"{result.name} needs user confirmation.",
                        retry_allowed=True,
                    )
                )
                hints.append("Ask the user to confirm, then retry with confirmed=true.")
            else:
                actions.append(
                    RecoveryAction(
                        kind="tool_failed",
                        message=f"{result.name} failed: {result.error or 'unknown'}",
                        retry_allowed=True,
                    )
                )
                rollback.append(result.name)
                hints.append(
                    f"Tool {result.name} failed. Explain the error and retry with corrected args."
                )
        hint = " ".join(hints)
        if hint:
            log.info("recovery_plan_created", action_count=len(actions))
        return RecoveryPlan(actions=actions, rollback_ids=rollback, hint_for_llm=hint)
