"""Memory write policy — gate what gets stored or embedded per turn."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from agent_core.guardrails import normalize_input
from agent_core.intent_gates import is_greeting
from agent_core.query_preprocessor import TaskIntent
from agent_core.schemas import AgentProduct
from agent_core.turn_router import RoutingDecision

_POISON_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)",
        r"disregard\s+(all\s+)?(previous|prior|system)",
        r"<\s*/?\s*system\s*>",
        r"you\s+are\s+now\s+(unrestricted|jailbroken|dan)\b",
        r"###\s*instruction",
        r"system\s*:\s*you\s+must",
        r"reveal\s+(your\s+)?(system\s+)?prompt",
        r"override\s+(safety|guardrails?|policy)",
    )
)


@dataclass(frozen=True)
class TurnContext:
    raw_text: str
    routing: RoutingDecision | None = None
    intent: TaskIntent = TaskIntent.unknown
    content_type: str = "message"
    is_tool_error: bool = False


class MemoryWritePolicy:
    """Decide whether a turn should be persisted or embedded."""

    _NEVER_STORE_INTENTS = frozenset(
        {TaskIntent.conversational, TaskIntent.capabilities}
    )

    def is_poison_attempt(self, text: str) -> bool:
        """True when content looks like prompt-injection meant to poison vector memory."""
        cleaned = normalize_input(text or "")
        return any(p.search(cleaned) for p in _POISON_PATTERNS)

    def neutralize_poison(self, text: str) -> str:
        """Strip poison markers; return empty if nothing safe remains."""
        cleaned = normalize_input(text or "")
        for pattern in _POISON_PATTERNS:
            cleaned = pattern.sub("[filtered]", cleaned)
        cleaned = cleaned.strip()
        if not cleaned or cleaned == "[filtered]":
            return ""
        return cleaned[:4000]

    def should_store(self, turn: TurnContext) -> bool:
        if turn.is_tool_error:
            return False
        if is_greeting(turn.raw_text):
            return False
        if self.is_poison_attempt(turn.raw_text):
            return False
        intent = self._intent(turn)
        if intent in self._NEVER_STORE_INTENTS:
            return False
        if turn.routing is not None and turn.routing.path == "chat":
            return False
        return True

    def should_embed(self, turn: TurnContext) -> bool:
        if not self.should_store(turn):
            return False
        if turn.is_tool_error:
            return False
        intent = self._intent(turn)
        if intent in {TaskIntent.question, TaskIntent.analyze}:
            return True
        return intent in {TaskIntent.create, TaskIntent.edit, TaskIntent.bulk, TaskIntent.bulk_operation}

    def should_ignore(self, turn: TurnContext) -> bool:
        return not self.should_store(turn)

    def should_delete(self, turn: TurnContext) -> bool:
        return False

    @staticmethod
    def _intent(turn: TurnContext) -> TaskIntent:
        if turn.routing is not None:
            return turn.routing.intent
        return turn.intent

    @staticmethod
    def is_permanent(meta: dict[str, Any] | None) -> bool:
        if not meta:
            return False
        return meta.get("permanent") is True or meta.get("memory_type") == "permanent"

    @staticmethod
    def should_prune_fact(
        *,
        created_at: datetime,
        meta: dict[str, Any] | None,
        max_age_days: int = 90,
        now: datetime | None = None,
    ) -> bool:
        if MemoryWritePolicy.is_permanent(meta):
            return False
        ref = now or datetime.now(timezone.utc)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        age = ref - created_at
        return age.days >= max_age_days


async def prune_stale_facts(
    adapter: Any,
    *,
    tenant_id: str,
    product: AgentProduct,
    max_age_days: int = 90,
) -> int:
    """Prune stale facts for one tenant via the product memory adapter."""
    prune = getattr(adapter, "prune_stale_facts", None)
    if prune is None:
        return 0
    return int(
        await prune(
            tenant_id=tenant_id,
            product=product,
            max_age_days=max_age_days,
        )
    )


def maybe_store_template_name(
    entities: dict[str, Any] | None,
    *,
    tenant_scoped: bool = True,
) -> bool:
    """Template names may be stored when tenant-scoped and explicitly named."""
    if not tenant_scoped:
        return False
    if not entities:
        return False
    return bool(entities.get("template_name") or entities.get("template_id"))
