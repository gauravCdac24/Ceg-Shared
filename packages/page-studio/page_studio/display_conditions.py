"""Display conditions — show/hide blocks by simple attribute rules (Templatical-inspired)."""
from __future__ import annotations

import json
from typing import Any


def _eval_condition(condition: dict[str, Any] | None, context: dict[str, Any]) -> bool:
    if not condition or not isinstance(condition, dict):
        return True
    field = str(condition.get("field") or condition.get("attribute") or "").strip().lower()
    op = str(condition.get("operator") or "equals").strip().lower()
    expected = condition.get("value")
    actual = context.get(field)
    if op in ("equals", "eq", "=="):
        return str(actual) == str(expected)
    if op in ("not_equals", "neq", "!="):
        return str(actual) != str(expected)
    if op == "exists":
        return actual is not None and str(actual).strip() != ""
    if op == "not_exists":
        return actual is None or str(actual).strip() == ""
    return True


def filter_craft_by_display_conditions(craft_state: str, context: dict[str, Any]) -> str:
    tree = json.loads(craft_state)
    if not isinstance(tree, dict):
        return craft_state
    hidden: set[str] = set()
    for node_id, node in tree.items():
        if not isinstance(node, dict):
            continue
        props = node.get("props") if isinstance(node.get("props"), dict) else {}
        custom = node.get("custom") if isinstance(node.get("custom"), dict) else {}
        cond = props.get("displayCondition") or custom.get("displayCondition")
        if cond and not _eval_condition(cond, context):
            hidden.add(node_id)
    if not hidden:
        return craft_state
    filtered: dict[str, Any] = {}
    for node_id, node in tree.items():
        if node_id in hidden:
            continue
        if not isinstance(node, dict):
            filtered[node_id] = node
            continue
        copy = dict(node)
        child_ids = copy.get("nodes")
        if isinstance(child_ids, list):
            copy["nodes"] = [cid for cid in child_ids if cid not in hidden]
        filtered[node_id] = copy
    return json.dumps(filtered, separators=(",", ":"))
