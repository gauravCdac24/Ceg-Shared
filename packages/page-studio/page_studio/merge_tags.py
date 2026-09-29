"""Handlebars-style merge tags — Templatical liquid/handlebars pattern for landing pages."""
from __future__ import annotations

import re
from typing import Any

MERGE_TAG_HANDLEBARS = re.compile(r"\{\{\s*([a-z0-9_]+)\s*\}\}", re.IGNORECASE)

# Keys shared across products; each product may extend via build_merge_context extras.
BASE_MERGE_TAGS: list[dict[str, str]] = [
    {"tag": "{{org_name}}", "key": "org_name", "label": "Organisation name"},
    {"tag": "{{org_slug}}", "key": "org_slug", "label": "Public URL slug"},
    {"tag": "{{public_url}}", "key": "public_url", "label": "Public landing page URL"},
    {"tag": "{{contact_email}}", "key": "contact_email", "label": "Contact email"},
]

PRODUCT_MERGE_TAGS: dict[str, list[dict[str, str]]] = {
    "cert": [
        {"tag": "{{verify_url}}", "key": "verify_url", "label": "Certificate verify page"},
    ],
    "workshopos": [
        {"tag": "{{verify_url}}", "key": "verify_url", "label": "Certificate verify page"},
        {"tag": "{{workshops_url}}", "key": "workshops_url", "label": "Workshops listing URL"},
    ],
}


def list_merge_tag_defs(product: str) -> list[dict[str, str]]:
    extra = PRODUCT_MERGE_TAGS.get(product, [])
    return [*BASE_MERGE_TAGS, *extra]


def build_merge_context(
    *,
    org_name: str = "",
    org_slug: str = "",
    public_url: str = "",
    contact_email: str = "",
    verify_url: str = "",
    workshops_url: str = "",
    **extra: str,
) -> dict[str, str]:
    ctx = {
        "org_name": org_name.strip(),
        "org_slug": org_slug.strip(),
        "public_url": public_url.strip(),
        "contact_email": contact_email.strip(),
        "verify_url": verify_url.strip(),
        "workshops_url": workshops_url.strip(),
    }
    for k, v in extra.items():
        if isinstance(v, str):
            ctx[k] = v.strip()
    return ctx


def apply_merge_tags(text: str | None, context: dict[str, Any], *, leave_unknown: bool = True) -> str:
    if not text or not isinstance(text, str):
        return text or ""

    def repl(match: re.Match[str]) -> str:
        key = match.group(1).lower()
        val = context.get(key)
        if val is not None and str(val).strip():
            return str(val)
        return match.group(0) if leave_unknown else ""

    return MERGE_TAG_HANDLEBARS.sub(repl, text)
