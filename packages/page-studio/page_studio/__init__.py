"""Shared page studio document logic for Cert Studio and WorkshopOS."""

from page_studio.craft import resolve_craft_merge_tags, validate_craft_state
from page_studio.document import (
    append_publish_history,
    build_page_patch,
    parse_page_document,
    public_page_payload,
)
from page_studio.merge_tags import MERGE_TAG_HANDLEBARS, apply_merge_tags, build_merge_context
from page_studio.studio_meta import list_merge_tags, list_template_catalog

__all__ = [
    "MERGE_TAG_HANDLEBARS",
    "append_publish_history",
    "apply_merge_tags",
    "build_merge_context",
    "build_page_patch",
    "list_merge_tags",
    "list_template_catalog",
    "parse_page_document",
    "public_page_payload",
    "resolve_craft_merge_tags",
    "validate_craft_state",
]
