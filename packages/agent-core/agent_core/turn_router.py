"""Single entry point for turn routing — replaces scattered orchestrator branches."""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Any, Literal

import structlog
from agent_core.env_resolver import AGENT_PLANNER_ENABLED, resolve_bool_env
from agent_core.intent_gates import (
    capabilities_response_text,
    deterministic_intent,
    is_greeting,
    override_misclassified,
)
from agent_core.observability import log_turn_router_decision
from agent_core.query_preprocessor import PreprocessedQuery, QueryPreprocessor, TaskIntent

log = structlog.get_logger(__name__)

_PLAN_TRIGGERS = (
    "and then",
    "after that",
    "also",
    "redesign",
    "rebuild",
    "match brand",
    "bulk",
    "issue to",
    "compliance",
    "accessibility and",
    "then",
)
_MULTI_VERB = ("create", "improve", "recreate", "match", "issue", "check", "generate")
_VAGUE_PATTERNS = [
    re.compile(
        r"^(fix\s*(it|this)?|improve|change\s*(this)?|make\s*(it\s*)?(better|nicer|good)|"
        r"update\s*(it|this)?|redo|redo\s*it|help|ok|yes|no|do\s*it|go|apply)\.?$",
        re.IGNORECASE,
    ),
]
_CLARIFICATION_MAX_CHARS = 20

_PLAN_INTENTS = frozenset(
    {
        TaskIntent.create,
        TaskIntent.bulk,
        TaskIntent.bulk_operation,
        TaskIntent.orchestrate,
    }
)


class ConversationState(str, Enum):
    idle = "idle"
    chat = "chat"
    qa = "qa"
    plan = "plan"
    execute = "execute"
    clarification = "clarification"
    recovery = "recovery"


PathKind = Literal["chat", "ask", "plan", "agent"]


@dataclass(frozen=True)
class RoutingDecision:
    state: ConversationState
    intent: TaskIntent
    confidence: float
    path: PathKind
    reason: str
    preprocessed: PreprocessedQuery | None = None
    capabilities_text: str | None = None


def routing_decision_to_dict(decision: RoutingDecision) -> dict[str, Any]:
    """JSON-serializable routing snapshot for graph checkpoints."""
    payload: dict[str, Any] = {
        "state": decision.state.value,
        "intent": decision.intent.value,
        "confidence": decision.confidence,
        "path": decision.path,
        "reason": decision.reason,
    }
    if decision.capabilities_text is not None:
        payload["capabilities_text"] = decision.capabilities_text
    if decision.preprocessed is not None and decision.preprocessed.entities:
        payload["entities"] = dict(decision.preprocessed.entities)
    return payload


def routing_decision_from_dict(data: dict[str, Any]) -> RoutingDecision | None:
    """Reverse parse for tests and graph state hydration."""
    if not isinstance(data, dict) or not data.get("path"):
        return None
    try:
        path = str(data["path"])
        if path not in ("chat", "ask", "plan", "agent"):
            return None
        state = ConversationState(str(data["state"]))
        intent = TaskIntent(str(data["intent"]))
        confidence = float(data.get("confidence", 0.0))
        reason = str(data.get("reason") or "")
        cap = data.get("capabilities_text")
        capabilities_text = str(cap) if cap is not None else None
        entities = data.get("entities")
        preprocessed: PreprocessedQuery | None = None
        if isinstance(entities, dict) and entities:
            preprocessed = PreprocessedQuery(
                original="",
                rewritten="",
                intent=intent,
                entities=dict(entities),
                confidence=confidence,
            )
        return RoutingDecision(
            state=state,
            intent=intent,
            confidence=confidence,
            path=path,  # type: ignore[arg-type]
            reason=reason,
            preprocessed=preprocessed,
            capabilities_text=capabilities_text,
        )
    except (KeyError, ValueError, TypeError):
        return None


class TurnRouter:
    CONFIDENCE_TOOL_FLOOR = 0.72
    CONFIDENCE_CHAT_CEILING = 0.45

    def __init__(self, preprocessor: QueryPreprocessor | None = None) -> None:
        self.preprocessor = preprocessor

    async def route(self, raw_text: str, ctx: dict[str, Any] | None = None) -> RoutingDecision:
        ctx = ctx or {}
        msg = (raw_text or "").strip()
        trace_id = str(ctx.get("trace_id") or "")
        product_context = str(ctx.get("product_context") or "generic")

        if is_greeting(msg):
            det = deterministic_intent(msg, product_context=product_context)
            decision = self._decision(
                ConversationState.chat,
                TaskIntent.conversational,
                det.confidence if det else 0.98,
                "chat",
                "greeting_short_circuit",
                det,
            )
            log_turn_router_decision(decision, trace_id=trace_id or None)
            return decision

        det = deterministic_intent(msg, product_context=product_context)
        if det is not None and det.intent == TaskIntent.conversational and det.confidence >= 0.9:
            decision = self._decision(
                ConversationState.chat,
                det.intent,
                det.confidence,
                "chat",
                "deterministic_conversational",
                det,
            )
            log_turn_router_decision(decision, trace_id=trace_id or None)
            return decision

        if det is not None and det.intent == TaskIntent.capabilities and det.confidence >= 0.9:
            decision = RoutingDecision(
                state=ConversationState.chat,
                intent=det.intent,
                confidence=det.confidence,
                path="chat",
                reason="deterministic_capabilities",
                preprocessed=det,
                capabilities_text=capabilities_response_text(product_context=product_context),
            )
            log_turn_router_decision(decision, trace_id=trace_id or None)
            return decision

        if det is not None and det.intent == TaskIntent.bulk_operation and det.confidence >= 0.85:
            qty = int(det.entities.get("quantity") or 0)
            if qty > 100:
                decision = self._decision(
                    ConversationState.clarification,
                    det.intent,
                    det.confidence,
                    "agent",
                    "bulk_quantity_requires_confirmation",
                    det,
                )
                log_turn_router_decision(decision, trace_id=trace_id or None)
                return decision
            decision = self._decision(
                ConversationState.execute,
                det.intent,
                det.confidence,
                "agent",
                "deterministic_bulk",
                det,
            )
            log_turn_router_decision(decision, trace_id=trace_id or None)
            return decision

        # WL-074: high-confidence deterministic intents skip LLM preprocess.
        if det is not None and det.confidence >= 0.9:
            if det.intent == TaskIntent.question:
                decision = self._decision(
                    ConversationState.qa,
                    det.intent,
                    det.confidence,
                    "ask",
                    "deterministic_question",
                    det,
                )
                log_turn_router_decision(decision, trace_id=trace_id or None)
                return decision
            if det.intent == TaskIntent.analyze:
                decision = self._decision(
                    ConversationState.qa,
                    det.intent,
                    det.confidence,
                    "ask",
                    "deterministic_analyze",
                    det,
                )
                log_turn_router_decision(decision, trace_id=trace_id or None)
                return decision
            if det.intent == TaskIntent.edit:
                decision = self._decision(
                    ConversationState.execute,
                    det.intent,
                    det.confidence,
                    "agent",
                    "deterministic_edit",
                    det,
                )
                log_turn_router_decision(decision, trace_id=trace_id or None)
                return decision
            if det.intent == TaskIntent.create:
                if self._should_plan(det, ctx):
                    decision = self._decision(
                        ConversationState.plan,
                        det.intent,
                        det.confidence,
                        "plan",
                        "plan_policy",
                        det,
                    )
                    log_turn_router_decision(decision, trace_id=trace_id or None)
                    return decision
                decision = self._decision(
                    ConversationState.execute,
                    det.intent,
                    det.confidence,
                    "agent",
                    "deterministic_create",
                    det,
                )
                log_turn_router_decision(decision, trace_id=trace_id or None)
                return decision

        if self._is_vague(msg) and not (
            det is not None
            and det.confidence >= 0.85
            and det.intent
            in {
                TaskIntent.create,
                TaskIntent.analyze,
                TaskIntent.bulk,
                TaskIntent.bulk_operation,
                TaskIntent.question,
                TaskIntent.capabilities,
                TaskIntent.conversational,
            }
        ):
            pre_vague = det or PreprocessedQuery(
                original=raw_text,
                rewritten=msg,
                intent=TaskIntent.unknown,
                entities={},
                suggested_mode="ask",
                confidence=0.4,
            )
            decision = self._decision(
                ConversationState.clarification,
                pre_vague.intent,
                pre_vague.confidence,
                "ask",
                "vague_request",
                pre_vague,
            )
            log_turn_router_decision(decision, trace_id=trace_id or None)
            return decision

        if self.preprocessor is None:
            pre = det or PreprocessedQuery(
                original=raw_text,
                rewritten=msg,
                intent=TaskIntent.unknown,
                entities={},
                suggested_mode="agent",
                confidence=0.0,
            )
        else:
            pre = await self.preprocessor.preprocess(msg, product_context=product_context)
            pre = override_misclassified(msg, pre, product_context=product_context)

        if pre.confidence < self.CONFIDENCE_CHAT_CEILING:
            decision = self._decision(
                ConversationState.clarification,
                pre.intent,
                pre.confidence,
                "ask",
                "low_confidence",
                pre,
            )
            log_turn_router_decision(decision, trace_id=trace_id or None)
            return decision

        if pre.intent in {TaskIntent.conversational, TaskIntent.capabilities}:
            cap_text = (
                capabilities_response_text(product_context=product_context)
                if pre.intent == TaskIntent.capabilities
                else None
            )
            decision = RoutingDecision(
                state=ConversationState.chat,
                intent=pre.intent,
                confidence=pre.confidence,
                path="chat",
                reason="conversational_intent",
                preprocessed=pre,
                capabilities_text=cap_text,
            )
            log_turn_router_decision(decision, trace_id=trace_id or None)
            return decision

        if pre.intent == TaskIntent.question:
            decision = self._decision(
                ConversationState.qa,
                pre.intent,
                pre.confidence,
                "ask",
                "question_intent",
                pre,
            )
            log_turn_router_decision(decision, trace_id=trace_id or None)
            return decision

        if pre.confidence < self.CONFIDENCE_TOOL_FLOOR:
            entities = pre.entities or {}
            if (
                pre.intent in {TaskIntent.create, TaskIntent.edit}
                and bool(entities)
            ):
                decision = self._decision(
                    ConversationState.execute,
                    pre.intent,
                    pre.confidence,
                    "agent",
                    "preview_first_low_confidence",
                    pre,
                )
                log_turn_router_decision(decision, trace_id=trace_id or None)
                return decision
            decision = self._decision(
                ConversationState.qa,
                pre.intent,
                pre.confidence,
                "ask",
                "below_tool_floor",
                pre,
            )
            log_turn_router_decision(decision, trace_id=trace_id or None)
            return decision

        if self._should_plan(pre, ctx):
            decision = self._decision(
                ConversationState.plan,
                pre.intent,
                pre.confidence,
                "plan",
                "plan_policy",
                pre,
            )
            log_turn_router_decision(decision, trace_id=trace_id or None)
            return decision

        decision = self._decision(
            ConversationState.execute,
            pre.intent,
            pre.confidence,
            "agent",
            "default_execute",
            pre,
        )
        log_turn_router_decision(decision, trace_id=trace_id or None)
        return decision

    @staticmethod
    def _is_vague(user_msg: str) -> bool:
        msg = (user_msg or "").strip()
        if not msg or is_greeting(msg):
            return False
        words = msg.split()
        is_too_short = len(msg) < _CLARIFICATION_MAX_CHARS
        is_single_word = len(words) == 1
        is_vague = any(p.search(msg) for p in _VAGUE_PATTERNS)
        return is_single_word or is_vague or (is_too_short and len(words) <= 2)

    def _complexity_score(self, msg: str, ctx: dict[str, Any]) -> int:
        """Rule-based complexity score (formerly assess_complexity in planning.py)."""
        lower = (msg or "").lower()
        score = 0
        if any(t in lower for t in _PLAN_TRIGGERS):
            score += 2
        if sum(v in lower for v in _MULTI_VERB) >= 2:
            score += 2
        if len(lower.split()) > 40:
            score += 1
        request_context = ctx.get("request_context") or {}
        element_count = int(request_context.get("canvas_element_count") or 0)
        if element_count > 25:
            score += 1
        return score

    def _should_plan(self, pre: PreprocessedQuery, ctx: dict[str, Any]) -> bool:
        if not resolve_bool_env(AGENT_PLANNER_ENABLED, profile_default=False):
            return False
        if pre.intent in {TaskIntent.conversational, TaskIntent.question}:
            return False
        if pre.intent not in _PLAN_INTENTS:
            return False
        if bool(ctx.get("plan_mode_requested")):
            return True
        request_context = ctx.get("request_context") or {}
        if str(request_context.get("mode") or "").lower() == "plan":
            return True
        if self._complexity_score(pre.rewritten or pre.original, ctx) >= 3:
            return True
        return pre.suggested_mode == "plan"

    @staticmethod
    def _decision(
        state: ConversationState,
        intent: TaskIntent,
        confidence: float,
        path: PathKind,
        reason: str,
        pre: PreprocessedQuery | None,
    ) -> RoutingDecision:
        decision = RoutingDecision(
            state=state,
            intent=intent,
            confidence=confidence,
            path=path,
            reason=reason,
            preprocessed=pre,
        )
        log.info(
            "turn_router_decision",
            state=state.value,
            intent=intent.value,
            confidence=confidence,
            path=path,
            reason=reason,
        )
        return decision
