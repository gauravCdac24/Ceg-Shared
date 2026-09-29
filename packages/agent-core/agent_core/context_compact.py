"""Shrink agent context before serializing into LLM prompts."""

from __future__ import annotations

import json
from typing import Any, Mapping

# Keep prompts small on CPU-only Ollama hosts (avoids 50k+ token dumps).
MAX_CONTEXT_JSON_CHARS = 3_200  # ~800 tokens at 4 chars/token
MAX_CANVAS_OBJECTS_LISTED = 20
MAX_SELECTED_OBJECT_CHARS = 400
MAX_ELEMENT_TEXT_CHARS = 120
CHAT_ROUTING_PATHS = frozenset({"chat"})
# WL-077: ask path gets summary-only canvas (no element dump).
ASK_ROUTING_PATHS = frozenset({"ask"})
MAX_CONTEXT_JSON_CHARS_ASK = 1_600
MAX_CANVAS_OBJECTS_ASK = 0  # summary / counts only


def estimate_tokens(text: str) -> int:
    """Rough token estimate for logging (no tokenizer on CPU hosts)."""
    return max(0, len(text or "") // 4)


def _object_type_label(obj: dict[str, Any]) -> str:
    typ = obj.get("type")
    if isinstance(typ, str) and typ.strip():
        return typ.strip()
    content = obj.get("content")
    if isinstance(content, str) and content.strip():
        return content.strip()[:48]
    return "object"


def _compact_element(obj: dict[str, Any]) -> dict[str, Any]:
    """Type, position, size, and text only — drop Fabric styling blobs."""
    slim: dict[str, Any] = {"type": _object_type_label(obj)}
    for key in ("left", "top", "width", "height"):
        val = obj.get(key)
        if isinstance(val, (int, float)):
            slim[key] = round(float(val), 1)
    for text_key in ("text", "content", "name"):
        val = obj.get(text_key)
        if isinstance(val, str) and val.strip():
            slim["text"] = val.strip()[:MAX_ELEMENT_TEXT_CHARS]
            break
    return slim


def _layout_hint(objects: list[dict[str, Any]]) -> str:
    if not objects:
        return "empty"
    xs = [float(o["left"]) for o in objects if isinstance(o.get("left"), (int, float))]
    ys = [float(o["top"]) for o in objects if isinstance(o.get("top"), (int, float))]
    if len(xs) < 2 or len(ys) < 2:
        return "centered"
    x_span = max(xs) - min(xs)
    y_span = max(ys) - min(ys)
    if x_span < 80 and y_span < 80:
        return "centered"
    if x_span > y_span * 1.5:
        return "horizontal"
    if y_span > x_span * 1.5:
        return "vertical"
    return "scattered"


def compact_canvas_summary(canvas_json: Mapping[str, Any] | None) -> dict[str, Any]:
    """Build a compact canvas summary for LLM context (no raw Fabric JSON)."""
    if not isinstance(canvas_json, dict):
        return {}
    objects_raw = canvas_json.get("objects")
    if not isinstance(objects_raw, list):
        return {}
    objects = [o for o in objects_raw if isinstance(o, dict)]
    if not objects:
        return {"canvas_element_count": 0}

    type_counts: dict[str, int] = {}
    for obj in objects:
        label = _object_type_label(obj)
        type_counts[label] = type_counts.get(label, 0) + 1

    out: dict[str, Any] = {"canvas_element_count": len(objects)}

    if len(objects) > MAX_CANVAS_OBJECTS_LISTED:
        parts = [f"{count} {name}" for name, count in sorted(type_counts.items(), key=lambda x: -x[1])]
        layout = _layout_hint(objects)
        out["canvas_summary"] = (
            f"{len(objects)} elements: {', '.join(parts[:8])}; layout {layout}"
        )
        return out

    out["canvas_elements"] = [_compact_element(o) for o in objects[:MAX_CANVAS_OBJECTS_LISTED]]
    return out


def compact_context_for_prompt(
    context: Mapping[str, Any] | None,
    *,
    routing_path: str | None = None,
) -> dict[str, Any]:
    """Return a prompt-safe copy of context without full canvas JSON blobs."""
    compact, _ = compact_context_for_prompt_with_stats(context, routing_path=routing_path)
    return compact


def compact_context_for_prompt_with_stats(
    context: Mapping[str, Any] | None,
    *,
    routing_path: str | None = None,
) -> tuple[dict[str, Any], dict[str, int]]:
    """Compact context and return token-ish stats for production logging."""
    stats = {
        "raw_canvas_tokens": 0,
        "compacted_tokens": 0,
        "canvas_skipped_for_chat": False,
    }
    if not context:
        return {}, stats

    out: dict[str, Any] = dict(context)
    canvas_json = out.pop("canvas_json", None)
    craft_state = out.pop("craft_state", None)

    if isinstance(canvas_json, dict):
        stats["raw_canvas_tokens"] = estimate_tokens(json.dumps(canvas_json, ensure_ascii=False))

    skip_canvas = routing_path in CHAT_ROUTING_PATHS
    ask_compact = routing_path in ASK_ROUTING_PATHS
    if skip_canvas:
        stats["canvas_skipped_for_chat"] = True
        for key in (
            "canvas_element_count",
            "canvas_object_types",
            "canvas_elements",
            "canvas_summary",
            "placeholder_fields",
            "craft_state_summary",
            "current_canvas_code",
        ):
            out.pop(key, None)
    else:
        if isinstance(canvas_json, dict):
            if ask_compact:
                # WL-077: counts + layout hint only — no per-object dump.
                objects_raw = canvas_json.get("objects")
                objects = [o for o in objects_raw if isinstance(o, dict)] if isinstance(objects_raw, list) else []
                out["canvas_element_count"] = len(objects)
                if objects:
                    type_counts: dict[str, int] = {}
                    for obj in objects:
                        label = _object_type_label(obj)
                        type_counts[label] = type_counts.get(label, 0) + 1
                    parts = [f"{c} {n}" for n, c in sorted(type_counts.items(), key=lambda x: -x[1])]
                    out["canvas_summary"] = (
                        f"{len(objects)} elements: {', '.join(parts[:6])}; layout {_layout_hint(objects)}"
                    )
            else:
                out.update(compact_canvas_summary(canvas_json))
                placeholders = canvas_json.get("placeholderFields") or canvas_json.get("placeholder_fields")
                if isinstance(placeholders, list) and placeholders:
                    out.setdefault("placeholder_fields", [str(p) for p in placeholders[:16]])

        if craft_state and isinstance(craft_state, str) and craft_state.strip():
            out.setdefault("craft_state_summary", "landing draft present (full tree omitted)")

    sel = out.get("selected_object")
    if isinstance(sel, dict):
        slim = {k: sel[k] for k in ("type", "id", "name", "content", "text") if k in sel}
        raw = json.dumps(slim or sel, ensure_ascii=False)
        if len(raw) > MAX_SELECTED_OBJECT_CHARS:
            out["selected_object"] = {"type": slim.get("type"), "id": slim.get("id"), "note": "truncated"}
        else:
            out["selected_object"] = slim or sel

    max_chars = MAX_CONTEXT_JSON_CHARS_ASK if ask_compact else MAX_CONTEXT_JSON_CHARS
    serialized = json.dumps(out, ensure_ascii=False)
    if len(serialized) > max_chars:
        keep_keys = (
            "surface",
            "org_name",
            "org_slug",
            "domain_prefix",
            "template_id",
            "template_name",
            "template_type",
            "canvas_element_count",
            "canvas_summary",
            "canvas_elements",
            "placeholder_fields",
            "current_stage",
            "craft_state_summary",
            "relevant_memory",
        )
        out = {k: out[k] for k in keep_keys if k in out}
        serialized = json.dumps(out, ensure_ascii=False)

    stats["compacted_tokens"] = estimate_tokens(serialized)
    return out, stats
