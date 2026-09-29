"""Lightweight pre-processing pass using the fast model."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import structlog

from agent_core.ollama_client import OllamaClient
from agent_core.schemas import TaskKind

log = structlog.get_logger(__name__)


class TaskIntent(str, Enum):
    conversational = "conversational"
    question = "question"
    create = "create"
    edit = "edit"
    analyze = "analyze"
    bulk = "bulk"
    bulk_operation = "bulk_operation"
    capabilities = "capabilities"
    search = "search"
    orchestrate = "orchestrate"
    unknown = "unknown"


@dataclass
class PreprocessedQuery:
    original: str
    rewritten: str
    intent: TaskIntent
    entities: dict[str, Any] = field(default_factory=dict)
    suggested_mode: str = "agent"
    confidence: float = 0.0


_PREPROCESSOR_SYSTEM_FALLBACK = """
You are a query preprocessor for a government AI agent platform.
Your job is to analyze a user's message and output structured JSON.
You NEVER answer the user's question. You ONLY classify and rewrite it.

Output ONLY valid JSON, no markdown, no explanation:
{
  "rewritten": "<explicit task description, 1-2 sentences, imperative>",
  "intent": "<conversational|question|create|edit|analyze|bulk|search|orchestrate|unknown>",
  "entities": {<any extracted IDs or key values from the message>},
  "suggested_mode": "<ask|plan|agent>",
  "confidence": <0.0 to 1.0>
}

Mode selection rules:
- "ask" → user wants a direct answer, no mutation, no multi-step workflow
- "plan" → user wants to understand how to do something before doing it, or explicitly says "plan", "how would I", "what steps"
- "agent" → user wants something done: create, edit, bulk, search, workflow

Intent rules (critical):
- "conversational" → greetings, thanks, small talk ("hi", "hello", "how are you") — NEVER edit/create
- "create" → generate/issue/make a certificate or new template ("generate a certificate for John Doe")
- "edit" → modify existing design/copy/layout ("edit hero copy", "change the border color")
- "question" → informational only, no mutation

Keep rewritten concise. Preserve all IDs, names, quantities from the original.
If input is unclear, set confidence below 0.5 and keep rewritten = original.
""".strip()


def preprocessor_system_prompt() -> str:
    from agent_core.prompt_loader import _log_prompt_first_use, load_prompt

    _log_prompt_first_use("router_v1.md")
    return load_prompt("router_v1.md", fallback=_PREPROCESSOR_SYSTEM_FALLBACK)


def get_preprocessor_system_prompt() -> str:
    """Lazy alias — router prompt loads only when preprocessing runs."""
    return preprocessor_system_prompt()


def _heuristic_preprocess(raw_query: str, product_context: str = "") -> PreprocessedQuery | None:
    """Keyword fallback when the fast model is offline or returns invalid JSON."""
    from agent_core.intent_gates import deterministic_intent

    gated = deterministic_intent(raw_query, product_context=product_context or "generic")
    if gated is not None:
        return gated

    msg = (raw_query or "").lower()
    if not msg.strip():
        return None

    edit_kw = (
        "redesign", "improve", "layout", "color", "palette", "typography",
        "move", "resize", "border", "background", "modern", "professional",
    )
    create_kw = ("create", "make", "new certificate", "from scratch", "generate")
    analyze_kw = ("accessibility", "audit", "review", "check", "contrast", "readability")
    bulk_kw = ("bulk", "csv", "recipients", "issue certificates")
    question_kw = ("what", "how", "why", "explain", "?")

    if any(k in msg for k in bulk_kw):
        intent = TaskIntent.bulk
    elif any(k in msg for k in analyze_kw):
        intent = TaskIntent.analyze
    elif any(k in msg for k in create_kw):
        intent = TaskIntent.create
    elif any(k in msg for k in edit_kw):
        intent = TaskIntent.edit
    elif any(k in msg for k in question_kw):
        intent = TaskIntent.question
    else:
        return None

    return PreprocessedQuery(
        original=raw_query,
        rewritten=raw_query,
        intent=intent,
        entities={},
        suggested_mode="agent",
        confidence=0.55,
    )


class QueryPreprocessor:
    def __init__(self, ollama_client: OllamaClient, fast_model: str) -> None:
        self._llm = ollama_client
        self._fast_model = fast_model

    async def preprocess(self, raw_query: str, product_context: str = "") -> PreprocessedQuery:
        from agent_core.intent_gates import deterministic_intent, override_misclassified

        gated = deterministic_intent(raw_query, product_context=product_context or "generic")
        if gated is not None and gated.confidence >= 0.9:
            log.info(
                "intent_classified",
                intent=gated.intent.value,
                confidence=gated.confidence,
                source="deterministic_gate",
                product=product_context,
            )
            return gated

        prompt = f"Product context: {product_context}\nUser message: {raw_query}"
        try:
            data = await self._llm.chat_json(
                system=preprocessor_system_prompt(),
                prompt=prompt,
                model=self._fast_model,
                temperature=0.1,
                max_tokens=300,
                task_kind=TaskKind.chat_fast,
            )
            confidence = float(data.get("confidence", 0.0))
            intent_raw = str(data.get("intent", "unknown"))
            try:
                intent = TaskIntent(intent_raw)
            except ValueError:
                intent = TaskIntent.unknown
            if intent is TaskIntent.unknown:
                fallback = _heuristic_preprocess(raw_query, product_context=product_context)
                if fallback is not None:
                    return fallback
            rewritten = str(data.get("rewritten", raw_query))
            if confidence < 0.5:
                rewritten = raw_query
            result = PreprocessedQuery(
                original=raw_query,
                rewritten=rewritten,
                intent=intent,
                entities=data.get("entities") if isinstance(data.get("entities"), dict) else {},
                suggested_mode=str(data.get("suggested_mode", "agent")),
                confidence=confidence,
            )
            result = override_misclassified(raw_query, result, product_context=product_context or "generic")
            log.info(
                "intent_classified",
                intent=result.intent.value,
                confidence=result.confidence,
                source="llm",
                product=product_context,
            )
            return result
        except Exception as exc:
            log.warning("query_preprocess_failed", error=str(exc)[:200])
            fallback = _heuristic_preprocess(raw_query, product_context=product_context)
            if fallback is not None:
                log.info(
                    "intent_classified",
                    intent=fallback.intent.value,
                    confidence=fallback.confidence,
                    source="heuristic_fallback",
                    product=product_context,
                )
                return fallback
            return PreprocessedQuery(
                original=raw_query,
                rewritten=raw_query,
                intent=TaskIntent.unknown,
                entities={},
                suggested_mode="agent",
                confidence=0.0,
            )
