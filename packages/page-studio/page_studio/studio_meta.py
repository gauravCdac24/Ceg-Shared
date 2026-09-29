"""Studio metadata — merge tag registry and template catalog (server source of truth)."""
from __future__ import annotations

from page_studio.merge_tags import list_merge_tag_defs

TEMPLATE_CATALOG: dict[str, list[dict[str, str]]] = {
    "cert": [
        {"id": "blank", "name": "Blank page", "description": "Empty canvas."},
        {"id": "cert-university", "name": "University credentials", "description": "Marquee, verify, stats, FAQ, contact, social."},
        {"id": "cert-corporate", "name": "Corporate training", "description": "Marquee, stats, countdown, video, contact."},
        {"id": "cert-verify-first", "name": "Verify-first", "description": "Logo, verify, contact, social."},
    ],
    "workshopos": [
        {"id": "blank", "name": "Blank page", "description": "Empty canvas."},
        {"id": "conference", "name": "Conference", "description": "Hero and event listing."},
        {"id": "training", "name": "Training programme", "description": "Hero, stats, FAQ, contact."},
    ],
}


def list_merge_tags(product: str) -> list[dict[str, str]]:
    return list_merge_tag_defs(product)


def list_template_catalog(product: str) -> list[dict[str, str]]:
    return list(TEMPLATE_CATALOG.get(product, TEMPLATE_CATALOG.get("workshopos", [])))
