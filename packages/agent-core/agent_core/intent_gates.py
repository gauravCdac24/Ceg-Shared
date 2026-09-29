"""Deterministic intent gates — run before LLM classification and before tool execution."""

from __future__ import annotations

import re
from typing import Any

from agent_core.query_preprocessor import PreprocessedQuery, TaskIntent

_GREETING = re.compile(
    r"^(hi|hello|hey|hiya|howdy|yo|sup|"
    r"hi\s+there|hello\s+there|"
    r"good\s+(morning|afternoon|evening)|"
    r"thanks?|thank\s+you|thx|ty|"
    r"ok(?:ay)?|cool|cheers|"
    r"how\s+are\s+you|what'?s\s+up)[!.?\s,]*$",
    re.IGNORECASE,
)


def is_greeting(raw_query: str) -> bool:
    """True for short social openers — must not enter plan/clarify pipelines."""
    msg = (raw_query or "").strip()
    return bool(msg and _GREETING.match(msg))

_CAPABILITIES = re.compile(
    r"\b(what\s+can\s+you\s+do|what\s+do\s+you\s+do|what\s+are\s+you|"
    r"how\s+do\s+i\s+use(\s+this)?|help\s+me\s+get\s+started)\b",
    re.IGNORECASE,
)

_BULK_QTY = re.compile(r"\b(\d{2,}|hundred|thousand)\b", re.IGNORECASE)

_CERT_NOUN = r"(?:certificates?|certs?)"
_CERT_CREATE = re.compile(
    rf"\b(generate|issue|create|make|print|produce|award)\b.*\b{_CERT_NOUN}\b|"
    rf"\b{_CERT_NOUN}\s+(for|to)\b|"
    r"\b(certify|certification)\b.*\b(for|to)\b",
    re.IGNORECASE,
)

_IMPORT_TEMPLATE = re.compile(
    r"\b(import|upload|parse)\b.*\b(template|pdf|document)\b|"
    r"\b(template|pdf)\b.*\b(from\s+file|upload)\b",
    re.IGNORECASE,
)

_ANALYZE = re.compile(
    r"\b(analy[sz]e|review|audit|evaluate|inspect|assess|critique)\b.*\b("
    r"layout|design|accessibility|a11y|contrast|readability|certificate|template|hierarchy)\b|"
    r"\b(accessibility|a11y)\s+(check|audit|review)\b|"
    r"\b(run|perform)\s+an?\s+(accessibility|a11y)\s+check\b|"
    r"\bsuggest\s+(specific\s+)?improvements\b",
    re.IGNORECASE,
)

_EDIT = re.compile(
    r"\b(edit|change|update|modify|redesign|improve|fix|move|resize|"
    r"hero\s+copy|typography|color|palette|background|font)\b|"
    r"\b(improve|redesign)\s+the\s+layout\b",
    re.IGNORECASE,
)

# High-confidence Cert Studio layout/color tweaks — skip LLM preprocessor (WL-074).
_COLOR_LAYOUT_TWEAK = re.compile(
    r"\b("
    r"make\s+(it\s+)?(more\s+)?(blue|red|green|gold|navy|maroon|teal|orange|purple|white|black|grey|gray)|"
    r"(change|set|use|apply|switch)\s+(the\s+)?(color|colour|palette|background|font|title\s+color)|"
    r"(increase|decrease|bump|reduce)\s+(the\s+)?(font|title|heading)?\s*size|"
    r"(more|less|tighter|looser)\s+(spacing|margin|padding|kerning)|"
    r"(center|left[- ]?align|right[- ]?align)\s+(the\s+)?(title|text|logo)|"
    r"tweak\s+(the\s+)?(layout|colors?|colours?|spacing)|"
    r"(swap|replace)\s+(the\s+)?(logo|background|border)|"
    # Chip / short canvas mutations — must not fall through to create-from-brief.
    r"(add|draw|put|apply)\s+(a\s+)?(decorative\s+)?(border|frame)|"
    r"decorative\s+(border|frame)|"
    r"convert\s+(to\s+)?(a\s+)?decorative\s+frame|"
    r"(generate|create|add|set|apply)\s+(a\s+)?(background\s+)?(pattern|gradient)|"
    r"background\s+pattern|"
    r"suggest\s+layout\s+improvements"
    r")\b",
    re.IGNORECASE,
)

_READ_ONLY_PREFIXES = ("get_", "check_", "preview_", "list_", "search_", "fetch_")

PREVIEW_FIRST_TOOL_NAMES = frozenset(
    {
        "get_template_info",
        "preview_certificate",
        "canvas_analyze",
    }
)


def filter_tools_preview_first(tool_names: set[str]) -> set[str]:
    """First turn on low-confidence create/edit — read-only / preview tools only."""
    if not tool_names:
        return set()
    preview = {n for n in tool_names if n in PREVIEW_FIRST_TOOL_NAMES}
    preview |= {n for n in tool_names if n.startswith(_READ_ONLY_PREFIXES)}
    return preview or {n for n in tool_names if not is_mutation_tool(n)}

_CERT_REQUIRED_FIELDS = ("recipient_name", "course_name", "serial_number")

_CERT_FIELD_LABELS = {
    "recipient_name": "recipient name",
    "course_name": "course or program title",
    "serial_number": "certificate serial number",
}

_RECIPIENT_FOR = re.compile(
    r"\b(?:for|to)\s+([A-Za-z][A-Za-z\s.'-]{1,80}?)(?:\s*,|\s+(?:on|for|in|with|serial|course|cert)|$)",
    re.IGNORECASE,
)
_COURSE = re.compile(
    r"\b(?:course|program|training|workshop)(?:\s+(?:title|name))?[:\s]+([^,\n]+)|"
    r"\b(?:on|for)\s+(?:the\s+)?([^,\n]{3,80}?)\s+(?:course|program|training|workshop)\b",
    re.IGNORECASE,
)
_SERIAL = re.compile(
    r"\b(?:serial(?:\s+(?:no|number|#))?|certificate\s+(?:no|number|id)|cert\s+id)[:\s#]+([^\s,\n]+)|"
    r"\b(MeitY/[^\s,\n]+)",
    re.IGNORECASE,
)

_MUTATION_KEYWORDS = (
    "improve",
    "recreate",
    "create",
    "bulk",
    "issue",
    "certificate",
    "cert",
    "canvas",
    "brand",
    "template",
    "design",
    "update",
    "edit",
)


def deterministic_intent(raw_query: str, *, product_context: str = "generic") -> PreprocessedQuery | None:
    """High-confidence classification without LLM.

    Keep this **product-agnostic by default**. Product-specific gates (e.g. Cert Studio)
    must be explicitly enabled via `product_context`.
    """
    msg = (raw_query or "").strip()
    if not msg:
        return None

    if _GREETING.match(msg):
        return PreprocessedQuery(
            original=raw_query,
            rewritten=raw_query,
            intent=TaskIntent.conversational,
            entities={},
            suggested_mode="ask",
            confidence=0.98,
        )

    if _CAPABILITIES.search(msg):
        return PreprocessedQuery(
            original=raw_query,
            rewritten=msg,
            intent=TaskIntent.capabilities,
            entities={},
            suggested_mode="ask",
            confidence=0.95,
        )

    is_cert_studio = str(product_context or "").lower() in {"cert_studio", "certstudio", "certificate", "cert"}

    if is_cert_studio and _IMPORT_TEMPLATE.search(msg):
        return PreprocessedQuery(
            original=raw_query,
            rewritten=msg,
            intent=TaskIntent.create,
            entities={"import_template": True},
            suggested_mode="agent",
            confidence=0.9,
        )

    if is_cert_studio and _CERT_CREATE.search(msg) and _BULK_QTY.search(msg):
        qty_match = _BULK_QTY.search(msg)
        qty_raw = (qty_match.group(1) if qty_match else "").lower()
        quantity = 100 if qty_raw in {"hundred", "thousand"} else int(qty_raw) if qty_raw.isdigit() else 0
        return PreprocessedQuery(
            original=raw_query,
            rewritten=msg,
            intent=TaskIntent.bulk_operation,
            entities={"quantity": quantity},
            suggested_mode="agent",
            confidence=0.9,
        )

    if is_cert_studio and _CERT_CREATE.search(msg):
        return PreprocessedQuery(
            original=raw_query,
            rewritten=msg,
            intent=TaskIntent.create,
            entities={},
            suggested_mode="agent",
            confidence=0.92,
        )

    if _ANALYZE.search(msg):
        return PreprocessedQuery(
            original=raw_query,
            rewritten=msg,
            intent=TaskIntent.analyze,
            entities={},
            suggested_mode="ask",
            confidence=0.9,
        )

    if is_cert_studio and _COLOR_LAYOUT_TWEAK.search(msg):
        return PreprocessedQuery(
            original=raw_query,
            rewritten=msg,
            intent=TaskIntent.edit,
            entities={"layout_tweak": True},
            suggested_mode="agent",
            confidence=0.93,
        )

    if _EDIT.search(msg):
        return PreprocessedQuery(
            original=raw_query,
            rewritten=msg,
            intent=TaskIntent.edit,
            entities={},
            suggested_mode="agent",
            confidence=0.9,
        )

    if re.search(
        r"\b(tell\s+me\s+about|what\s+is|what\s+are|how\s+does|explain)\b",
        msg,
        re.IGNORECASE,
    ):
        return PreprocessedQuery(
            original=raw_query,
            rewritten=msg,
            intent=TaskIntent.question,
            entities={},
            suggested_mode="ask",
            confidence=0.9,
        )

    return None


def override_misclassified(
    raw_query: str,
    pre: PreprocessedQuery,
    *,
    product_context: str = "generic",
) -> PreprocessedQuery:
    """Correct LLM misclassification (e.g. greeting classified as edit)."""
    det = deterministic_intent(raw_query, product_context=product_context)
    if det is None:
        return pre

    if det.intent == TaskIntent.conversational and pre.intent in {
        TaskIntent.edit,
        TaskIntent.create,
        TaskIntent.bulk,
        TaskIntent.analyze,
        TaskIntent.orchestrate,
    }:
        return det

    if (
        det.intent == TaskIntent.conversational
        and len((raw_query or "").strip()) <= 24
        and pre.confidence < 0.75
    ):
        return det

    if (
        det.intent == TaskIntent.create
        and pre.intent == TaskIntent.edit
        and str(product_context or "").lower() in {"cert_studio", "certstudio", "certificate", "cert"}
        and _CERT_CREATE.search(raw_query or "")
    ):
        return det

    if det.intent == TaskIntent.analyze and pre.intent in {
        TaskIntent.edit,
        TaskIntent.orchestrate,
        TaskIntent.create,
    }:
        return det

    return pre


def extract_cert_create_entities(raw_query: str) -> dict[str, str]:
    """Best-effort extraction of certificate issuance fields from natural language."""
    msg = (raw_query or "").strip()
    entities: dict[str, str] = {}

    recipient = _RECIPIENT_FOR.search(msg)
    if recipient:
        name = recipient.group(1).strip().rstrip(".")
        if name and len(name.split()) <= 6:
            entities["recipient_name"] = name

    course = _COURSE.search(msg)
    if course:
        value = (course.group(1) or course.group(2) or "").strip().rstrip(".")
        if value:
            entities["course_name"] = value

    serial = _SERIAL.search(msg)
    if serial:
        value = (serial.group(1) or serial.group(2) or "").strip().rstrip(".")
        if value:
            entities["serial_number"] = value

    return entities


def missing_cert_fields_for_create(raw_query: str) -> list[str]:
    """When the user asks to create/issue a certificate, list missing required fields."""
    msg = (raw_query or "").strip()
    if not _CERT_CREATE.search(msg):
        return []
    entities = extract_cert_create_entities(msg)
    return [field for field in _CERT_REQUIRED_FIELDS if not entities.get(field)]


def cert_create_clarification(raw_query: str) -> dict[str, Any] | None:
    """Structured clarification payload when create intent lacks issuance fields."""
    missing = missing_cert_fields_for_create(raw_query)
    if not missing:
        return None

    questions = [f"What is the {_CERT_FIELD_LABELS[field]}?" for field in missing]
    summary = "I can generate the certificate once you share: " + ", ".join(
        _CERT_FIELD_LABELS[field] for field in missing
    ) + "."
    return {
        "event": "clarification_needed",
        "needs_clarification": True,
        "missing_fields": missing,
        "questions": questions,
        "question": questions[0] if len(questions) == 1 else summary,
        "options": questions[:4],
        "message": summary + " " + " ".join(questions),
    }


def capabilities_response_text(*, product_context: str = "generic") -> str:
    ctx = str(product_context or "").lower()
    if ctx in {"cert_studio", "certstudio", "certificate", "cert"}:
        return (
            "I help you design, review, and issue certificates in Cert Studio. "
            "Ask me to analyze layout and accessibility, improve typography and colors, "
            "create templates from a brief, or prepare bulk issuance — I'll guide you step by step."
        )
    return "I can help you with agent-assisted tasks in this product. Tell me what you're trying to do."


def filter_tools_for_intent(intent: TaskIntent, tool_names: set[str]) -> set[str]:
    """Restrict tool surface area by classified intent before LLM tool-calling."""
    if not tool_names:
        return set()

    if intent in {TaskIntent.conversational, TaskIntent.capabilities}:
        return set()

    if intent == TaskIntent.question:
        return {n for n in tool_names if n.startswith(_READ_ONLY_PREFIXES)}

    if intent == TaskIntent.create:
        matched = {
            n
            for n in tool_names
            if any(k in n.lower() for k in ("certificate", "cert", "create", "bulk", "issue", "preview", "template"))
        }
        matched |= {n for n in tool_names if n.startswith(_READ_ONLY_PREFIXES)}
        return matched or tool_names

    if intent == TaskIntent.edit:
        matched = {
            n
            for n in tool_names
            if any(k in n.lower() for k in ("improve", "recreate", "canvas", "brand", "design", "edit", "update"))
        }
        matched |= {n for n in tool_names if n.startswith(_READ_ONLY_PREFIXES)}
        return matched or tool_names

    if intent == TaskIntent.analyze:
        matched = {
            n
            for n in tool_names
            if any(
                k in n.lower()
                for k in ("check", "preview", "analyze", "accessibility", "audit", "review", "suggest", "layout")
            )
        }
        matched |= {n for n in tool_names if n.startswith(_READ_ONLY_PREFIXES)}
        return matched or {n for n in tool_names if n.startswith(_READ_ONLY_PREFIXES)} or tool_names

    if intent in {TaskIntent.bulk, TaskIntent.bulk_operation}:
        matched = {n for n in tool_names if "bulk" in n.lower() or "issue" in n.lower()}
        matched |= {n for n in tool_names if n.startswith(_READ_ONLY_PREFIXES)}
        return matched or tool_names

    return tool_names


def is_mutation_tool(tool_name: str) -> bool:
    lower = (tool_name or "").lower()
    if lower.startswith(_READ_ONLY_PREFIXES):
        return False
    return any(k in lower for k in _MUTATION_KEYWORDS)


def tool_allowed_for_intent(intent: TaskIntent, tool_name: str) -> bool:
    """Last-line gate at tool execution — block mutation tools for conversational/question."""
    if intent in {TaskIntent.conversational, TaskIntent.capabilities}:
        return False
    if intent == TaskIntent.question:
        return not is_mutation_tool(tool_name)
    return True
