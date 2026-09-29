"""Fast-model verification of agent outputs and tool results."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

import structlog

from agent_core.model_router import ModelRouter
from agent_core.ollama_client import OllamaClient
from agent_core.schemas import TaskKind, VerifyResult

log = structlog.get_logger(__name__)

_CRITIC_SYSTEM = (
    "You are a strict QA critic for an enterprise AI agent. "
    "Respond with JSON only: "
    '{"approved": boolean, "issues": [string], "suggestion": string}. '
    "Approve if the response adequately addresses the user goal and tool results are consistent."
)


@dataclass
class CriticVerdict:
    approved: bool
    issues: list[str]
    suggestion: str
    raw: dict
    skip_reason: str | None = None


class Critic:
    def __init__(self, *, llm: OllamaClient, router: ModelRouter) -> None:
        self._llm = llm
        self._router = router

    async def verify(
        self,
        *,
        user_goal: str,
        agent_response: str,
        tool_summary: str = "",
    ) -> CriticVerdict:
        route = self._router.route(TaskKind.chat_fast)
        prompt = (
            f"User goal:\n{user_goal[:1500]}\n\n"
            f"Agent response:\n{agent_response[:3000]}\n\n"
            f"Tool results:\n{tool_summary[:2000] or '(none)'}"
        )
        try:
            raw = await self._llm.chat_json(
                system=_CRITIC_SYSTEM,
                prompt=prompt,
                model=route.model,
                temperature=0.1,
                max_tokens=512,
            )
        except Exception as exc:
            log.error("critic_unavailable", error=str(exc))
            return CriticVerdict(
                approved=False,
                issues=["Quality gate unavailable — response withheld for safety"],
                suggestion="",
                raw={"fallback": True, "error": str(exc)},
                skip_reason="critic_unavailable",
            )
        approved = bool(raw.get("approved", False))
        issues = [str(i) for i in (raw.get("issues") or []) if i]
        suggestion = str(raw.get("suggestion") or "")
        log.info("critic_verdict", approved=approved, issue_count=len(issues))
        return CriticVerdict(
            approved=approved,
            issues=issues,
            suggestion=suggestion,
            raw=raw if isinstance(raw, dict) else {},
        )

    async def post_exec_verify(self, step: Any, result: dict[str, Any]) -> VerifyResult:
        """Verify a step result matches expected outcome (Sprint 2 state machine hook)."""
        if not result:
            return VerifyResult(confident=False, score=0.1, issues=["Empty result"])
        if isinstance(result, dict) and result.get("error"):
            return VerifyResult(
                confident=False,
                score=0.2,
                issues=[str(result["error"])[:500]],
            )
        # Fast heuristic path — no LLM call needed for simple success
        return VerifyResult(confident=True, score=0.9, issues=[])
