"""Tests for shared page-studio package."""
from __future__ import annotations

import json

import pytest

from page_studio.craft import (
    MAX_BLOCKS_PER_PAGE,
    MAX_CRAFT_STATE_BYTES,
    MAX_CUSTOM_CODE_CHARS,
    MAX_GALLERY_IMAGES,
    MAX_SEO_TITLE_CHARS,
    MAX_TEXTBLOCK_CHARS,
    CraftValidationError,
    resolve_craft_merge_tags,
    validate_craft_state,
    validate_seo_fields,
)
from page_studio.document import build_page_patch, normalize_incoming_slug_page, public_page_payload
from page_studio.merge_tags import apply_merge_tags, build_merge_context


CRAFT_MIN = json.dumps({"ROOT": {"type": {"resolvedName": "PageRoot"}, "isCanvas": True, "props": {}, "nodes": []}})


def test_validate_craft_state_requires_root() -> None:
    with pytest.raises(CraftValidationError):
        validate_craft_state('{"foo":{}}')


def test_validate_craft_state_ok_under_limits() -> None:
    tree = validate_craft_state(CRAFT_MIN)
    assert "ROOT" in tree


def test_validate_rejects_oversized_bytes() -> None:
    pad = "x" * (MAX_CRAFT_STATE_BYTES + 100)
    raw = json.dumps(
        {
            "ROOT": {
                "type": {"resolvedName": "PageRoot"},
                "isCanvas": True,
                "props": {"pad": pad},
                "nodes": [],
            }
        }
    )
    with pytest.raises(CraftValidationError, match="bytes"):
        validate_craft_state(raw)


def test_validate_rejects_too_many_blocks() -> None:
    tree: dict = {
        "ROOT": {"type": {"resolvedName": "PageRoot"}, "isCanvas": True, "props": {}, "nodes": []},
    }
    for i in range(MAX_BLOCKS_PER_PAGE):
        nid = f"n{i}"
        tree[nid] = {
            "type": {"resolvedName": "SpacerBlock"},
            "props": {},
            "nodes": [],
        }
        tree["ROOT"]["nodes"].append(nid)
    with pytest.raises(CraftValidationError, match="blocks"):
        validate_craft_state(json.dumps(tree))


def test_validate_rejects_textblock_overflow() -> None:
    tree = {
        "ROOT": {"type": {"resolvedName": "PageRoot"}, "isCanvas": True, "props": {}, "nodes": ["t1"]},
        "t1": {
            "type": {"resolvedName": "TextBlock"},
            "props": {"text": "a" * (MAX_TEXTBLOCK_CHARS + 1)},
            "nodes": [],
        },
    }
    with pytest.raises(CraftValidationError, match="TextBlock.text"):
        validate_craft_state(json.dumps(tree))


def test_validate_rejects_custom_code_overflow() -> None:
    tree = {
        "ROOT": {"type": {"resolvedName": "PageRoot"}, "isCanvas": True, "props": {}, "nodes": ["c1"]},
        "c1": {
            "type": {"resolvedName": "CustomCodeBlock"},
            "props": {"html": "h" * (MAX_CUSTOM_CODE_CHARS + 1), "css": "", "js": ""},
            "nodes": [],
        },
    }
    with pytest.raises(CraftValidationError, match="CustomCodeBlock.html"):
        validate_craft_state(json.dumps(tree))


def test_validate_rejects_gallery_overflow() -> None:
    tree = {
        "ROOT": {"type": {"resolvedName": "PageRoot"}, "isCanvas": True, "props": {}, "nodes": ["g1"]},
        "g1": {
            "type": {"resolvedName": "GalleryBlock"},
            "props": {"images": [{"url": f"https://x/{i}"} for i in range(MAX_GALLERY_IMAGES + 1)]},
            "nodes": [],
        },
    }
    with pytest.raises(CraftValidationError, match="images"):
        validate_craft_state(json.dumps(tree))


def test_validate_rejects_javascript_button_url() -> None:
    tree = {
        "ROOT": {"type": {"resolvedName": "PageRoot"}, "isCanvas": True, "props": {}, "nodes": ["b1"]},
        "b1": {
            "type": {"resolvedName": "ButtonBlock"},
            "props": {"action": {"type": "open_url", "url": "javascript:alert(1)"}},
            "nodes": [],
        },
    }
    with pytest.raises(CraftValidationError, match="Unsafe URL"):
        validate_craft_state(json.dumps(tree))


def test_validate_rejects_javascript_image_link() -> None:
    tree = {
        "ROOT": {"type": {"resolvedName": "PageRoot"}, "isCanvas": True, "props": {}, "nodes": ["i1"]},
        "i1": {
            "type": {"resolvedName": "ImageBlock"},
            "props": {"src": "https://cdn.example/img.png", "link": "javascript:alert(1)"},
            "nodes": [],
        },
    }
    with pytest.raises(CraftValidationError, match="Unsafe URL"):
        validate_craft_state(json.dumps(tree))


def test_validate_allows_https_image_link() -> None:
    tree = {
        "ROOT": {"type": {"resolvedName": "PageRoot"}, "isCanvas": True, "props": {}, "nodes": ["i1"]},
        "i1": {
            "type": {"resolvedName": "ImageBlock"},
            "props": {"src": "https://cdn.example/img.png", "link": "https://example.com"},
            "nodes": [],
        },
    }
    validate_craft_state(json.dumps(tree))


def test_validate_rejects_arbitrary_video_embed() -> None:
    tree = {
        "ROOT": {"type": {"resolvedName": "PageRoot"}, "isCanvas": True, "props": {}, "nodes": ["v1"]},
        "v1": {
            "type": {"resolvedName": "VideoBlock"},
            "props": {"videoUrl": "https://evil.example/embed"},
            "nodes": [],
        },
    }
    with pytest.raises(CraftValidationError, match="Unsafe URL"):
        validate_craft_state(json.dumps(tree))


def test_validate_seo_fields() -> None:
    validate_seo_fields(seo_title="ok", seo_description="ok")
    with pytest.raises(CraftValidationError, match="seo_title"):
        validate_seo_fields(seo_title="t" * (MAX_SEO_TITLE_CHARS + 1))


def test_build_page_patch_rejects_long_seo() -> None:
    with pytest.raises(CraftValidationError, match="seo_title"):
        build_page_patch(CRAFT_MIN, {}, "draft", seo_title="t" * (MAX_SEO_TITLE_CHARS + 1))


def test_build_page_patch_publish_history() -> None:
    patch = build_page_patch(CRAFT_MIN, {}, "publish")
    assert patch["published"] is True
    assert patch["published_craft_state"] == CRAFT_MIN
    assert len(patch["history"]) == 1


def test_public_payload_strips_draft_on_live() -> None:
    lp = build_page_patch(CRAFT_MIN, {}, "publish")
    live = public_page_payload(lp, preview=False, allow_draft=False)
    assert live["published_craft_state"] == CRAFT_MIN
    assert "craft_state" not in live


def test_merge_tags_in_craft_tree() -> None:
    tree = {
        "ROOT": {"type": {"resolvedName": "PageRoot"}, "isCanvas": True, "props": {}, "nodes": ["t1"]},
        "t1": {
            "type": {"resolvedName": "TextBlock"},
            "props": {"text": "Welcome to {{org_name}}"},
            "nodes": [],
        },
    }
    raw = json.dumps(tree)
    ctx = build_merge_context(org_name="CDAC")
    out = json.loads(resolve_craft_merge_tags(raw, ctx))
    assert out["t1"]["props"]["text"] == "Welcome to CDAC"


def test_normalize_incoming_slug_page_validates() -> None:
    with pytest.raises(CraftValidationError):
        normalize_incoming_slug_page({"craft_state": "not-json"})


def test_apply_merge_tags_unknown_preserved() -> None:
    assert apply_merge_tags("Hi {{org_name}}", {"org_name": "X"}) == "Hi X"
    assert apply_merge_tags("Hi {{missing}}", {}, leave_unknown=True) == "Hi {{missing}}"
