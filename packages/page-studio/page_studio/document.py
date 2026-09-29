"""Craft.js page document — draft/publish, history, public payload (Templatical-style lifecycle)."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

MAX_HISTORY = 5


def parse_page_document(raw: Any) -> dict[str, Any]:
    if not raw or not isinstance(raw, dict):
        return {}
    doc = deepcopy(raw)
    if not isinstance(doc.get("watermark"), dict):
        doc["watermark"] = {}
    if not isinstance(doc.get("page_background"), dict):
        doc.pop("page_background", None)
    if not isinstance(doc.get("history"), list):
        doc["history"] = []
    if doc.get("blocks") is not None and not isinstance(doc.get("blocks"), list):
        doc["blocks"] = []
    return doc


def append_publish_history(page_doc: dict[str, Any], craft_state: str) -> list[dict[str, Any]]:
    entry = {"saved_at": datetime.now(timezone.utc).isoformat(), "craft_state": craft_state}
    history = page_doc.get("history") if isinstance(page_doc.get("history"), list) else []
    return [entry, *history][:MAX_HISTORY]


def build_page_patch(
    craft_state: str,
    page_doc: dict[str, Any],
    mode: str,
    *,
    seo_title: str | None = None,
    seo_description: str | None = None,
    watermark: dict[str, Any] | None = None,
    page_background: dict[str, Any] | None = None,
    preserve_blocks: bool = True,
) -> dict[str, Any]:
    from page_studio.craft import validate_seo_fields

    published = mode == "publish"
    base = parse_page_document(page_doc)
    next_title = seo_title if seo_title is not None else base.get("seo_title", "")
    next_desc = seo_description if seo_description is not None else base.get("seo_description", "")
    validate_seo_fields(
        seo_title=next_title if isinstance(next_title, str) else "",
        seo_description=next_desc if isinstance(next_desc, str) else "",
    )
    patch: dict[str, Any] = {
        "published": published,
        "draft": not published,
        "craft_state": craft_state,
        "seo_title": next_title if isinstance(next_title, str) else "",
        "seo_description": next_desc if isinstance(next_desc, str) else "",
        "watermark": watermark if watermark is not None else base.get("watermark", {}),
    }
    bg = page_background if page_background is not None else base.get("page_background")
    if isinstance(bg, dict):
        patch["page_background"] = bg
    if preserve_blocks and isinstance(base.get("blocks"), list):
        patch["blocks"] = base["blocks"]
    if published:
        patch["published_craft_state"] = craft_state
        patch["history"] = append_publish_history(base, craft_state)
    else:
        if base.get("published_craft_state"):
            patch["published_craft_state"] = base["published_craft_state"]
        if base.get("history"):
            patch["history"] = base["history"]
    return patch


def normalize_incoming_slug_page(incoming: dict[str, Any], existing: dict[str, Any] | None = None) -> dict[str, Any]:
    """Validate and normalize slug_page/landing_page from generic branding PATCH."""
    from page_studio.craft import validate_craft_state

    base = parse_page_document(existing or {})
    merged = parse_page_document({**base, **incoming})
    craft = merged.get("craft_state")
    if isinstance(craft, str) and craft.strip():
        validate_craft_state(craft)
    published_state = merged.get("published_craft_state")
    if isinstance(published_state, str) and published_state.strip():
        validate_craft_state(published_state)
    # Reconcile publish: if client marks published and states match, ensure history
    if merged.get("published") and isinstance(craft, str) and craft.strip():
        if merged.get("published_craft_state") == craft:
            if not merged.get("history"):
                merged["history"] = append_publish_history(base, craft)
            merged["draft"] = False
    return merged


def public_page_payload(
    page_doc: dict[str, Any] | None,
    *,
    preview: bool,
    allow_draft: bool,
    legacy_blocks: bool = False,
) -> dict[str, Any]:
    doc = parse_page_document(page_doc or {})
    published = bool(doc.get("published", True))
    draft_state = doc.get("craft_state") if isinstance(doc.get("craft_state"), str) else None
    published_state = doc.get("published_craft_state") if isinstance(doc.get("published_craft_state"), str) else None

    craft_state: str | None = None
    if preview and allow_draft:
        craft_state = draft_state or published_state
    elif published:
        craft_state = published_state or draft_state

    payload: dict[str, Any] = {
        "published": published,
        "watermark": doc.get("watermark") if isinstance(doc.get("watermark"), dict) else {},
        "seo_title": doc.get("seo_title") if isinstance(doc.get("seo_title"), str) else "",
        "seo_description": doc.get("seo_description") if isinstance(doc.get("seo_description"), str) else "",
    }
    page_bg = doc.get("page_background")
    if isinstance(page_bg, dict):
        payload["page_background"] = page_bg

    if legacy_blocks:
        blocks = doc.get("blocks") or []
        visible = [b for b in blocks if isinstance(b, dict) and b.get("visible", True)] if published else []
        payload["blocks"] = visible

    if preview and allow_draft:
        if draft_state:
            payload["craft_state"] = draft_state
        if published_state:
            payload["published_craft_state"] = published_state
    elif published and craft_state:
        payload["published_craft_state"] = craft_state
    return payload


def pick_history_entry(page_doc: dict[str, Any], *, saved_at: str | None = None, index: int | None = None) -> str | None:
    history = page_doc.get("history")
    if not isinstance(history, list) or not history:
        return None
    if saved_at:
        for entry in history:
            if isinstance(entry, dict) and entry.get("saved_at") == saved_at:
                craft = entry.get("craft_state")
                return craft if isinstance(craft, str) else None
        return None
    if index is not None and 0 <= index < len(history):
        entry = history[index]
        if isinstance(entry, dict):
            craft = entry.get("craft_state")
            return craft if isinstance(craft, str) else None
    return None
