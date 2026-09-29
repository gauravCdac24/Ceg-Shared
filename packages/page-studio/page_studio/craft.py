"""Craft.js JSON validation and merge-tag resolution in block props."""
from __future__ import annotations

import json
from typing import Any

# Hard caps — reject with CraftValidationError (HTTP 422). Never silently truncate.
MAX_CRAFT_STATE_BYTES = 500_000
MAX_CRAFT_BYTES = MAX_CRAFT_STATE_BYTES  # alias
MAX_CUSTOM_CODE_CHARS = 20_000
MAX_BLOCKS_PER_PAGE = 150
MAX_TEXTBLOCK_CHARS = 2_000
MAX_HELPER_CHARS = 2_000
MAX_SEO_TITLE_CHARS = 60
MAX_SEO_DESC_CHARS = 160
MAX_GALLERY_IMAGES = 50
MAX_ARRAY_ITEMS = 30  # FAQ items, social icons, stats

# Known blocks across Cert + WorkshopOS Experience Studio
ALLOWED_BLOCK_TYPES = frozenset(
    {
        "PageRoot",
        "HeroBlock",
        "TextBlock",
        "ImageBlock",
        "ButtonBlock",
        "SectionBlock",
        "LogoBlock",
        "DividerBlock",
        "GridSectionBlock",
        "GridCell",
        "ColumnsBlock",
        "CertVerifyBlock",
        "WorkshopEventsBlock",
        "QuizLiveBlock",
        "QuizLeaderboardBlock",
        "FAQBlock",
        "GalleryBlock",
        "StatsBlock",
        "MarqueeBlock",
        "ContactInfoBlock",
        "PartnerLogosBlock",
        "CountdownBlock",
        "SpacerBlock",
        "FreeBoardBlock",
        "CanvasFloatBlock",
        "DoodleBlock",
        "VideoBlock",
        "SocialIconsBlock",
        "CustomCodeBlock",
    }
)

MERGEABLE_PROP_KEYS = frozenset(
    {
        "text",
        "title",
        "heading",
        "subheading",
        "subtitle",
        "label",
        "placeholder",
        "buttonLabel",
        "description",
        "hint",
        "helperText",
        "verifyUrlHint",
        "seo_title",
        "seo_description",
    }
)

_CUSTOM_CODE_KEYS = ("html", "css", "js")
_ARRAY_PROP_LIMITS = {
    "images": MAX_GALLERY_IMAGES,
    "icons": MAX_ARRAY_ITEMS,
    "items": MAX_ARRAY_ITEMS,
}


class CraftValidationError(ValueError):
    pass


def validate_seo_fields(seo_title: str | None = None, seo_description: str | None = None) -> None:
    if seo_title is not None and len(seo_title) > MAX_SEO_TITLE_CHARS:
        raise CraftValidationError(
            f"seo_title exceeds {MAX_SEO_TITLE_CHARS} characters (got {len(seo_title)})"
        )
    if seo_description is not None and len(seo_description) > MAX_SEO_DESC_CHARS:
        raise CraftValidationError(
            f"seo_description exceeds {MAX_SEO_DESC_CHARS} characters (got {len(seo_description)})"
        )


def _sanitize_node_props(node: dict[str, Any]) -> bool:
    changed = False
    props = node.get("props")
    if props is None:
        node["props"] = {}
        changed = True
        props = node["props"]
    elif not isinstance(props, dict):
        node["props"] = {}
        changed = True
        props = node["props"]
    if "children" in props:
        props = dict(props)
        props.pop("children", None)
        node["props"] = props
        changed = True
    if "nodes" not in node or not isinstance(node.get("nodes"), list):
        node["nodes"] = []
        changed = True
    if "linkedNodes" not in node or not isinstance(node.get("linkedNodes"), dict):
        node["linkedNodes"] = {}
        changed = True
    return changed


def normalize_craft_state_tree(tree: dict[str, Any]) -> dict[str, Any]:
    """Repair common craft_state issues that crash Craft.js in the browser."""
    if not isinstance(tree, dict):
        return tree
    valid_ids = {k for k, v in tree.items() if isinstance(v, dict)}
    if "ROOT" not in valid_ids:
        tree["ROOT"] = {
            "type": {"resolvedName": "PageRoot"},
            "isCanvas": True,
            "props": {},
            "nodes": [],
            "linkedNodes": {},
        }
        valid_ids.add("ROOT")
    for node_id in list(valid_ids):
        node = tree.get(node_id)
        if not isinstance(node, dict):
            continue
        _sanitize_node_props(node)
        nodes = node.get("nodes")
        if isinstance(nodes, list):
            filtered = [cid for cid in nodes if cid in valid_ids]
            if filtered != nodes:
                node["nodes"] = filtered
        linked = node.get("linkedNodes")
        if isinstance(linked, dict):
            node["linkedNodes"] = {k: v for k, v in linked.items() if v in valid_ids}
    return tree


def _block_name(node: dict[str, Any]) -> str | None:
    node_type = node.get("type", {})
    if isinstance(node_type, dict):
        name = node_type.get("resolvedName")
        return name if isinstance(name, str) else None
    return None


def _validate_node_urls(node_id: str, block: str, props: dict[str, Any]) -> None:
    from page_studio.url_safety import assert_safe_url

    if block == "ButtonBlock":
        action = props.get("action")
        if isinstance(action, dict) and action.get("type") == "open_url":
            url = action.get("url")
            if isinstance(url, str):
                assert_safe_url(url, field=f"{block}.action.url", node_id=node_id, kind="open")

    for key in ("link",):
        val = props.get(key)
        if isinstance(val, str):
            assert_safe_url(val, field=f"{block}.{key}", node_id=node_id, kind="nav")

    for key in ("src", "logoUrl", "posterUrl", "iconUrl"):
        val = props.get(key)
        if isinstance(val, str):
            assert_safe_url(val, field=f"{block}.{key}", node_id=node_id, kind="media")

    video_url = props.get("videoUrl")
    if isinstance(video_url, str):
        assert_safe_url(video_url, field=f"{block}.videoUrl", node_id=node_id, kind="video")

    images = props.get("images")
    if isinstance(images, list):
        for i, img in enumerate(images):
            if isinstance(img, dict):
                src = img.get("src") or img.get("url")
                if isinstance(src, str):
                    assert_safe_url(
                        src,
                        field=f"{block}.images[{i}].src",
                        node_id=node_id,
                        kind="media",
                    )

    icons = props.get("icons")
    if isinstance(icons, list):
        for i, icon in enumerate(icons):
            if not isinstance(icon, dict):
                continue
            url = icon.get("url")
            if isinstance(url, str):
                assert_safe_url(
                    url,
                    field=f"{block}.icons[{i}].url",
                    node_id=node_id,
                    kind="nav",
                )
            icon_url = icon.get("iconUrl")
            if isinstance(icon_url, str):
                assert_safe_url(
                    icon_url,
                    field=f"{block}.icons[{i}].iconUrl",
                    node_id=node_id,
                    kind="media",
                )


def _validate_node_limits(node_id: str, node: dict[str, Any]) -> None:
    props = node.get("props")
    if not isinstance(props, dict):
        return
    block = _block_name(node) or "block"
    _validate_node_urls(node_id, block, props)

    if block == "CustomCodeBlock":
        for key in _CUSTOM_CODE_KEYS:
            val = props.get(key)
            if isinstance(val, str) and len(val) > MAX_CUSTOM_CODE_CHARS:
                raise CraftValidationError(
                    f"{block}.{key} exceeds {MAX_CUSTOM_CODE_CHARS} characters "
                    f"(node {node_id}, got {len(val)})"
                )

    if block == "TextBlock":
        text = props.get("text")
        if isinstance(text, str) and len(text) > MAX_TEXTBLOCK_CHARS:
            raise CraftValidationError(
                f"TextBlock.text exceeds {MAX_TEXTBLOCK_CHARS} characters "
                f"(node {node_id}, got {len(text)})"
            )

    for key in ("helperText", "verifyUrlHint"):
        val = props.get(key)
        if isinstance(val, str) and len(val) > MAX_HELPER_CHARS:
            raise CraftValidationError(
                f"{block}.{key} exceeds {MAX_HELPER_CHARS} characters "
                f"(node {node_id}, got {len(val)})"
            )

    for key, limit in _ARRAY_PROP_LIMITS.items():
        arr = props.get(key)
        if isinstance(arr, list) and len(arr) > limit:
            raise CraftValidationError(
                f"{block}.{key} exceeds {limit} items (node {node_id}, got {len(arr)})"
            )


def validate_craft_state(craft_state: str) -> dict[str, Any]:
    if not craft_state or not isinstance(craft_state, str):
        raise CraftValidationError("craft_state must be a non-empty string")
    nbytes = len(craft_state.encode("utf-8"))
    if nbytes > MAX_CRAFT_STATE_BYTES:
        raise CraftValidationError(
            f"craft_state exceeds {MAX_CRAFT_STATE_BYTES} bytes (got {nbytes})"
        )
    try:
        tree = json.loads(craft_state)
    except json.JSONDecodeError as exc:
        raise CraftValidationError("craft_state is not valid JSON") from exc
    if not isinstance(tree, dict):
        raise CraftValidationError("craft_state root must be a JSON object")
    if "ROOT" not in tree:
        raise CraftValidationError("craft_state must contain a ROOT node")
    if len(tree) > MAX_BLOCKS_PER_PAGE:
        raise CraftValidationError(
            f"craft_state exceeds {MAX_BLOCKS_PER_PAGE} blocks (got {len(tree)})"
        )
    root = tree.get("ROOT")
    if not isinstance(root, dict):
        raise CraftValidationError("ROOT must be an object")
    resolved = root.get("type", {})
    name = resolved.get("resolvedName") if isinstance(resolved, dict) else None
    if name and name not in ALLOWED_BLOCK_TYPES:
        raise CraftValidationError(f"Unknown root block type: {name}")
    for node_id, node in tree.items():
        if not isinstance(node, dict):
            raise CraftValidationError(f"Node {node_id} must be an object")
        block_name = _block_name(node)
        if block_name and block_name not in ALLOWED_BLOCK_TYPES:
            raise CraftValidationError(f"Unknown block type: {block_name}")
        _validate_node_limits(node_id, node)
    return normalize_craft_state_tree(tree)


def _resolve_props(props: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    from page_studio.merge_tags import apply_merge_tags

    out = dict(props)
    for key, val in props.items():
        if key in MERGEABLE_PROP_KEYS and isinstance(val, str):
            out[key] = apply_merge_tags(val, context, leave_unknown=True)
        elif key == "items" and isinstance(val, list):
            resolved_items = []
            for item in val:
                if isinstance(item, dict):
                    item_out = dict(item)
                    for ik, iv in item.items():
                        if isinstance(iv, str) and "{{" in iv:
                            item_out[ik] = apply_merge_tags(iv, context, leave_unknown=True)
                    resolved_items.append(item_out)
                else:
                    resolved_items.append(item)
            out[key] = resolved_items
    return out


def resolve_craft_merge_tags(craft_state: str, context: dict[str, Any]) -> str:
    tree = validate_craft_state(craft_state)
    resolved: dict[str, Any] = {}
    for node_id, node in tree.items():
        if not isinstance(node, dict):
            resolved[node_id] = node
            continue
        copy = dict(node)
        props = node.get("props")
        if isinstance(props, dict):
            copy["props"] = _resolve_props(props, context)
        resolved[node_id] = copy
    return json.dumps(resolved, separators=(",", ":"))
