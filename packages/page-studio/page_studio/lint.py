"""Accessibility / quality lint for Craft.js page documents (Templatical quality-inspired)."""
from __future__ import annotations

import json
from typing import Any, Literal

Severity = Literal["error", "warning", "info"]


def lint_craft_state(craft_state: str) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    try:
        tree = json.loads(craft_state)
    except json.JSONDecodeError:
        return [{"rule": "invalid_json", "severity": "error", "message": "Page JSON is invalid."}]
    if not isinstance(tree, dict):
        return [{"rule": "invalid_root", "severity": "error", "message": "Page root must be an object."}]
    if "ROOT" not in tree:
        issues.append({"rule": "missing_root", "severity": "error", "message": "Missing ROOT canvas node."})

    has_hero_or_text = False
    for node_id, node in tree.items():
        if not isinstance(node, dict):
            continue
        node_type = (node.get("type") or {}).get("resolvedName") if isinstance(node.get("type"), dict) else None
        props = node.get("props") if isinstance(node.get("props"), dict) else {}
        if node_type in ("HeroBlock", "TextBlock", "TitleBlock"):
            has_hero_or_text = True
        if node_type == "ImageBlock":
            src = str(props.get("src") or props.get("url") or "").strip()
            alt = str(props.get("alt") or "").strip()
            if src and not alt:
                issues.append(
                    {
                        "rule": "image_alt",
                        "severity": "warning",
                        "message": f"Image block '{node_id}' is missing alt text.",
                        "node_id": node_id,
                    }
                )
        if node_type == "ButtonBlock":
            label = str(props.get("label") or props.get("text") or "").strip()
            if not label:
                issues.append(
                    {
                        "rule": "button_label",
                        "severity": "error",
                        "message": f"Button '{node_id}' has no label.",
                        "node_id": node_id,
                    }
                )
        dc = props.get("displayCondition") or node.get("custom", {}).get("displayCondition")
        if dc and not isinstance(dc, dict):
            issues.append(
                {
                    "rule": "display_condition",
                    "severity": "warning",
                    "message": f"Block '{node_id}' has invalid display condition.",
                    "node_id": node_id,
                }
            )

    if not has_hero_or_text and len(tree) > 1:
        issues.append(
            {
                "rule": "empty_content",
                "severity": "info",
                "message": "Add a Hero or Text block so visitors see your message.",
            }
        )
    return issues
