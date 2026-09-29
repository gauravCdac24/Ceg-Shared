"""Post-turn reflection using fast model."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

import structlog

from agent_core.critic import Critic, CriticVerdict
from agent_core.model_router import ModelRouter
from agent_core.ollama_client import OllamaClient
from agent_core.schemas import MemoryType, StepEvent, TaskKind

if TYPE_CHECKING:
    from agent_core.memory_service import MemoryService

log = structlog.get_logger(__name__)


@dataclass
class ReflectionResult:
    should_retry: bool
    improved_hint: str
    critic: CriticVerdict


class ReflectionLoop:
    def __init__(self, *, llm: OllamaClient, router: ModelRouter) -> None:
        self._critic = Critic(llm=llm, router=router)
        self._llm = llm
        self._router = router

    async def reflect(
        self,
        *,
        user_goal: str,
        agent_response: str,
        tool_summary: str = "",
        max_retries: int = 1,
        retry_count: int = 0,
    ) -> ReflectionResult:
        verdict = await self._critic.verify(
            user_goal=user_goal,
            agent_response=agent_response,
            tool_summary=tool_summary,
        )
        should_retry = not verdict.approved and retry_count < max_retries
        hint = verdict.suggestion if should_retry else ""
        if should_retry:
            log.info("reflection_retry_suggested", issues=verdict.issues[:3])
        return ReflectionResult(
            should_retry=should_retry,
            improved_hint=hint,
            critic=verdict,
        )

    async def _call_llm(self, prompt: str) -> str:
        """Call the fast LLM model with a plain user prompt."""
        route = self._router.route(TaskKind.chat_fast)
        try:
            text = await self._llm.chat(
                model=route.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=256,
            )
            return (text or "").strip()[:1000]
        except Exception as exc:
            log.warning("reflection_llm_call_failed", error=str(exc))
            return ""

    async def run_reflection(
        self,
        job_id: str,
        goal: str,
        steps_completed: int,
        outcome: str,
        tenant_id: str,
        memory_service: "MemoryService",
        stream_bridge: Any = None,
        redis_client: Any = None,
    ) -> str:
        """Extract lessons from completed task; store as PROCEDURAL + EPISODIC memories."""
        prompt = (
            f"Task: {goal}\n"
            f"Steps: {steps_completed}\n"
            f"Outcome: {outcome}\n\n"
            "What procedure worked best? What should be remembered for next time? Reply in 2-3 sentences."
        )
        lesson_text = await self._call_llm(prompt)

        await memory_service.store(
            content=lesson_text or f"Completed: {goal}. Outcome: {outcome}.",
            tenant_id=tenant_id,
            memory_type=MemoryType.PROCEDURAL,
            metadata={"job_id": job_id, "goal": goal},
        )

        await memory_service.store(
            content=f"Completed: {goal}. Steps: {steps_completed}. Outcome: {outcome}.",
            tenant_id=tenant_id,
            memory_type=MemoryType.EPISODIC,
            metadata={"job_id": job_id},
        )

        if stream_bridge and redis_client:
            from agent_core.stream_bridge import emit_step_event
            _now = datetime.now(timezone.utc)
            try:
                await emit_step_event(
                    redis_client,
                    job_id,
                    StepEvent(
                        step_id="reflection",
                        step_name="Reflection",
                        status="done",
                        started_at=_now,
                        ended_at=_now,
                        result_summary=lesson_text[:200] if lesson_text else None,
                    ),
                )
            except Exception as exc:
                log.warning("reflection_emit_failed", error=str(exc))

        log.info(
            "reflection_stored",
            job_id=job_id,
            tenant_id=tenant_id,
            outcome=outcome,
            steps=steps_completed,
        )
        return lesson_text

    async def summarize_episode(self, *, user_goal: str, final_response: str) -> str:
        """Generate a short episodic fact for long-term memory."""
        route = self._router.route(TaskKind.chat_fast)
        try:
            text = await self._llm.chat(
                model=route.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Summarize this agent turn in one factual sentence for memory storage.",
                    },
                    {
                        "role": "user",
                        "content": f"User: {user_goal[:800]}\nAssistant: {final_response[:800]}",
                    },
                ],
                temperature=0.2,
                max_tokens=120,
            )
            return (text or "").strip()[:500]
        except Exception as exc:
            log.warning("episode_summary_failed", error=str(exc))
            return final_response[:200]
