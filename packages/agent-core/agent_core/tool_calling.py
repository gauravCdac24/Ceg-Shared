"""Native and structured tool-call parsing for agent runtime."""

from __future__ import annotations

import json
import re
from typing import Any

import structlog

from agent_core.schemas import ToolCallRequest, ToolSpec

log = structlog.get_logger(__name__)

_PII_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_PII_PHONE_RE = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{2,4}\)|\d{2,4})[-.\s]?\d{3,4}[-.\s]?\d{4}\b")
_PII_AADHAAR_RE = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")
_TOOLS_ALWAYS_STRIP_PII = frozenset(
    {
        "list_registrations",
        "list_attendees",
        "search_candidates",
        "get_registration_details",
    }
)


def strip_pii_from_tool_result(text: str, *, tool_name: str | None = None) -> str:
    """Redact common PII patterns from tool output before it enters follow-up prompts."""
    cleaned = text or ""
    if tool_name and tool_name not in _TOOLS_ALWAYS_STRIP_PII:
        if not _PII_EMAIL_RE.search(cleaned) and not _PII_PHONE_RE.search(cleaned):
            return cleaned
    cleaned = _PII_EMAIL_RE.sub("[email_redacted]", cleaned)
    cleaned = _PII_PHONE_RE.sub("[phone_redacted]", cleaned)
    cleaned = _PII_AADHAAR_RE.sub("[id_redacted]", cleaned)
    return cleaned


# DEPRECATED: regex markup kept as fallback only when native/JSON tool calls fail.
_TOOL_RE = re.compile(
    r"\[TOOL:(?P<name>\w+)\]\s*(?P<args>\{[^\[]*?)\s*\[/TOOL\]",
    re.DOTALL | re.IGNORECASE,
)

_JSON_TOOL_CALL_RE = re.compile(
    r'\{\s*"name"\s*:\s*"(?P<name>[\w]+)"\s*,\s*"arguments"\s*:\s*(?P<args>\{.*?\})\s*\}',
    re.DOTALL,
)


def specs_to_ollama_tools(specs: list[ToolSpec]) -> list[dict[str, Any]]:
    """Convert ToolSpec list to Ollama /api/chat tools payload."""
    tools: list[dict[str, Any]] = []
    for spec in specs:
        params = spec.parameters_schema or {"type": "object", "properties": {}}
        if "type" not in params:
            params = {"type": "object", "properties": params if isinstance(params, dict) else {}}
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": spec.name,
                    "description": spec.description,
                    "parameters": params,
                },
            }
        )
    return tools


def parse_native_tool_calls(raw_calls: list[dict[str, Any]] | None) -> list[ToolCallRequest]:
    """Parse Ollama message.tool_calls into ToolCallRequest list."""
    if not raw_calls:
        return []
    parsed: list[ToolCallRequest] = []
    for item in raw_calls:
        fn = item.get("function") if isinstance(item, dict) else None
        if not isinstance(fn, dict):
            continue
        name = str(fn.get("name") or "").strip()
        if not name:
            continue
        raw_args = fn.get("arguments")
        args: dict[str, Any] = {}
        if isinstance(raw_args, dict):
            args = raw_args
        elif isinstance(raw_args, str) and raw_args.strip():
            try:
                loaded = json.loads(raw_args)
                if isinstance(loaded, dict):
                    args = loaded
            except json.JSONDecodeError:
                log.warning("native_tool_args_parse_failed", tool=name)
        parsed.append(ToolCallRequest(name=name, arguments=args))
    return parsed


def extract_regex_tool_calls(text: str) -> list[ToolCallRequest]:
    """DEPRECATED fallback: parse [TOOL:name]{json}[/TOOL] markup."""
    calls: list[ToolCallRequest] = []
    for match in _TOOL_RE.finditer(text or ""):
        raw_args = (match.group("args") or "").strip() or "{}"
        try:
            args = json.loads(raw_args)
            if not isinstance(args, dict):
                args = {}
        except json.JSONDecodeError:
            try:
                fixed = raw_args + "}" * max(0, raw_args.count("{") - raw_args.count("}"))
                args = json.loads(fixed)
                if not isinstance(args, dict):
                    args = {}
            except Exception:
                log.warning("regex_tool_parse_error", tool=match.group("name"))
                continue
        calls.append(ToolCallRequest(name=match.group("name").strip(), arguments=args))
    return calls


def extract_json_tool_calls(text: str) -> list[ToolCallRequest]:
    """Fallback: parse inline {"name": "...", "arguments": {...}} blocks."""
    calls: list[ToolCallRequest] = []
    for match in _JSON_TOOL_CALL_RE.finditer(text or ""):
        try:
            args = json.loads(match.group("args"))
            if not isinstance(args, dict):
                args = {}
            calls.append(ToolCallRequest(name=match.group("name"), arguments=args))
        except json.JSONDecodeError:
            continue
    return calls


def extract_tool_calls(
    *,
    text: str,
    native_calls: list[dict[str, Any]] | None = None,
) -> tuple[list[ToolCallRequest], str]:
    """Resolve tool calls: native first, then JSON blocks, then regex markup."""
    native = parse_native_tool_calls(native_calls)
    if native:
        return native, "native"
    json_calls = extract_json_tool_calls(text)
    if json_calls:
        return json_calls, "json"
    regex_calls = extract_regex_tool_calls(text)
    if regex_calls:
        log.debug("tool_calls_regex_fallback", count=len(regex_calls))
        return regex_calls, "regex"
    return [], "none"


def validate_tool_arguments(spec: ToolSpec, arguments: dict[str, Any]) -> tuple[bool, str | None]:
    """Lightweight JSON-schema validation for required fields and types."""
    schema = spec.parameters_schema or {}
    if not schema:
        return True, None
    required = schema.get("required") or []
    props = schema.get("properties") or schema if schema.get("type") != "object" else schema.get("properties", {})
    if not isinstance(props, dict) and isinstance(schema, dict) and "type" not in schema:
        props = schema
    for field in required:
        if field not in arguments:
            return False, f"missing_required:{field}"
    for key, val in arguments.items():
        if not isinstance(props, dict):
            break
        prop = props.get(key)
        if not isinstance(prop, dict):
            continue
        expected = prop.get("type")
        if expected == "string" and not isinstance(val, str):
            return False, f"invalid_type:{key}"
        if expected == "boolean" and not isinstance(val, bool):
            return False, f"invalid_type:{key}"
        if expected == "integer" and not isinstance(val, int):
            return False, f"invalid_type:{key}"
        if expected == "object" and not isinstance(val, dict):
            return False, f"invalid_type:{key}"
    return True, None
