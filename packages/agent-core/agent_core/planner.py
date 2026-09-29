"""Goal → plan step generation for agent mode."""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import structlog
from pydantic import BaseModel, Field

from agent_core.model_router import ModelRouter, TaskType, route_model
from agent_core.ollama_client import OllamaClient
from agent_core.schemas import TaskKind

log = structlog.get_logger(__name__)

_PLANNER_SYSTEM_FALLBACK = (
    "You are a planning assistant. Given a user goal, output 2-5 concise actionable steps "
    "as plain text lines prefixed with [STEP N]. End with [PLAN_COMPLETE]. Do not call tools."
)


def planner_system_prompt() -> str:
    from agent_core.prompt_loader import load_prompt

    return load_prompt("planner_v1.md", fallback=_PLANNER_SYSTEM_FALLBACK)


# ── Pydantic models for structured planner output (Sprint 2) ─────────────────

class PlanStep(BaseModel):
    step_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    step_name: str
    capability_name: str = ""        # from capability_registry
    args_template: dict = {}          # LLM-filled args
    depends_on: list[str] = []       # step_ids this step waits for
    requires_approval: bool = False
    # Legacy integer step number for backward compat
    step: int = 0

    @property
    def text(self) -> str:
        """Backward-compat alias so existing code using step.text still works."""
        return self.step_name


class PlanResult(BaseModel):
    plan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    goal: str
    steps: list[PlanStep]
    raw: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Legacy dataclass kept for backward compatibility ──────────────────────────

@dataclass
class AgentPlan:
    goal: str
    steps: list[PlanStep]
    raw: str


class Planner:
    def __init__(self, *, llm: OllamaClient, router: ModelRouter) -> None:
        self._llm = llm
        self._router = router

    async def create_plan(self, *, goal: str, context: dict[str, Any] | None = None) -> AgentPlan:
        route = self._router.route(TaskKind.planning)
        model_name = route.model
        # BYO tenant override: if context carries tenant_config with ai_provider/ai_model, prefer it
        if context:
            byo = route_model(TaskType.PLANNING, tenant_config=context.get("tenant_config"))
            if byo.provider != "ollama":
                model_name = byo.model_name
        prompt = f"Goal: {goal.strip()[:2000]}"
        if context:
            prompt += f"\nContext: {context}"
        raw = await self._llm.chat(
            model=model_name,
            messages=[
                {"role": "system", "content": planner_system_prompt()},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1024,
        )
        steps = self._parse_steps(raw)
        log.info("agent_plan_created", step_count=len(steps), goal_len=len(goal))
        return AgentPlan(goal=goal, steps=steps, raw=raw)

    async def plan(
        self,
        goal: str,
        context: dict[str, Any] | None = None,
        available_capabilities: list[dict[str, Any]] | None = None,
    ) -> PlanResult:
        """Structured plan generation for Sprint 2 state machine."""
        route = self._router.route(TaskKind.planning)
        model_name = route.model
        # BYO tenant override
        if context:
            byo = route_model(TaskType.PLANNING, tenant_config=context.get("tenant_config"))
            if byo.provider != "ollama":
                model_name = byo.model_name
        caps_block = ""
        if available_capabilities:
            import json
            caps_block = f"\nAvailable capabilities (JSON):\n{json.dumps(available_capabilities, indent=2)[:3000]}"
        prompt = f"Goal: {goal.strip()[:2000]}{caps_block}"
        if context:
            prompt += f"\nContext: {context}"
        raw = await self._llm.chat(
            model=model_name,
            messages=[
                {"role": "system", "content": planner_system_prompt()},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1024,
        )
        pydantic_steps = self._parse_pydantic_steps(raw, available_capabilities or [])
        log.info("agent_structured_plan_created", step_count=len(pydantic_steps), goal_len=len(goal))
        return PlanResult(goal=goal, steps=pydantic_steps, raw=raw)

    @staticmethod
    def _parse_steps(text: str) -> list[PlanStep]:
        step_re = re.compile(r"\[STEP\s+(\d+)\]\s*(.+)", re.IGNORECASE)
        steps: list[PlanStep] = []
        for match in step_re.finditer(text or ""):
            steps.append(
                PlanStep(
                    step=int(match.group(1)),
                    step_name=match.group(2).strip(),
                    step_id=str(uuid.uuid4()),
                )
            )
        if not steps:
            for idx, line in enumerate((text or "").splitlines(), start=1):
                cleaned = line.strip()
                if cleaned:
                    steps.append(PlanStep(step=idx, step_name=cleaned, step_id=str(uuid.uuid4())))
        return steps[:8]

    @staticmethod
    def _parse_pydantic_steps(
        text: str,
        available_capabilities: list[dict[str, Any]],
    ) -> list[PlanStep]:
        step_re = re.compile(r"\[STEP\s+(\d+)\]\s*(.+)", re.IGNORECASE)
        cap_names = {c.get("capability_name", "") for c in available_capabilities}
        approval_caps = {
            c.get("capability_name", "")
            for c in available_capabilities
            if c.get("requires_approval")
        }
        steps: list[PlanStep] = []
        for match in step_re.finditer(text or ""):
            name = match.group(2).strip()
            # Best-effort: match capability by name substring
            matched_cap = next(
                (c["capability_name"] for c in available_capabilities if c["capability_name"] in name),
                "",
            )
            steps.append(
                PlanStep(
                    step=int(match.group(1)),
                    step_name=name,
                    step_id=str(uuid.uuid4()),
                    capability_name=matched_cap,
                    requires_approval=matched_cap in approval_caps,
                )
            )
        if not steps:
            for idx, line in enumerate((text or "").splitlines(), start=1):
                cleaned = line.strip()
                if cleaned:
                    steps.append(PlanStep(step=idx, step_name=cleaned, step_id=str(uuid.uuid4())))
        return steps[:8]
