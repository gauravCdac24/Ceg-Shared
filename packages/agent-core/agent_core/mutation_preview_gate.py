"""Server-side preview-before-commit gate for mutation tools."""

from __future__ import annotations

import json
import uuid
from typing import Any

import structlog

log = structlog.get_logger(__name__)

MUTATION_PREFIXES: tuple[str, ...] = (
    "handle_",
    "canvas_set_",
    "canvas_edit_selection",
    "resolve_canvas_logo",
    "generate_",
    "issue_",
    "add_questions",
)
COMMIT_TOOL_NAME = "commit_ghost"


def is_mutation_tool(name: str) -> bool:
    return any(name.startswith(prefix) for prefix in MUTATION_PREFIXES)


def register_ghost_preview(context: dict[str, Any]) -> str:
    """Allocate a ghost_id and register it on the session context."""
    ghost_id = str(uuid.uuid4())
    _ghost_ids(context).add(ghost_id)
    return ghost_id


def _ghost_ids(context: dict[str, Any]) -> set[str]:
    raw = context.get("_session_ghost_ids")
    if raw is None:
        ids: set[str] = set()
        context["_session_ghost_ids"] = ids
        return ids
    if isinstance(raw, set):
        return raw
    ids = set(str(x) for x in raw)
    context["_session_ghost_ids"] = ids
    return ids


def check_mutation_commit_allowed(
    tool_name: str,
    arguments: dict[str, Any],
    *,
    context: dict[str, Any],
) -> tuple[bool, str | None]:
    """Reject direct commit without a prior preview ghost_id in this session."""
    if not is_mutation_tool(tool_name):
        return True, None
    if arguments.get("committed") is not True:
        return True, None
    ghost_id = str(arguments.get("ghost_id") or "").strip()
    pending = _ghost_ids(context)
    if not ghost_id or ghost_id not in pending:
        log.warning(
            "mutation_commit_without_preview",
            tool=tool_name,
            ghost_id=ghost_id or None,
            tenant_id=context.get("tenant_id"),
        )
        return False, "mutation_commit_without_preview"
    pending.discard(ghost_id)
    return True, None


def wrap_mutation_preview_result(
    tool_name: str,
    result: str,
    *,
    arguments: dict[str, Any],
    context: dict[str, Any],
) -> str:
    """Register ghost_id for preview responses; block smuggled commits in JSON."""
    if not is_mutation_tool(tool_name):
        return result
    if arguments.get("committed") is True:
        return result

    payload: dict[str, Any]
    try:
        parsed = json.loads(result)
        payload = parsed if isinstance(parsed, dict) else {"result": parsed}
    except json.JSONDecodeError:
        payload = {"result": result}

    if payload.get("committed") is True and not arguments.get("ghost_id"):
        log.warning("mutation_result_commit_smuggle_blocked", tool=tool_name)
        payload["committed"] = False
        payload["preview"] = True
        payload["error"] = "preview_required_before_commit"

    ghost_id = str(payload.get("ghost_id") or uuid.uuid4())
    payload.setdefault("preview", True)
    payload["committed"] = False
    payload["ghost_id"] = ghost_id
    _ghost_ids(context).add(ghost_id)
    return json.dumps(payload, ensure_ascii=False)


async def commit_ghost_preview(
    ghost_id: str,
    *,
    context: dict[str, Any],
) -> str:
    """Explicit commit after user/agent accepts a previewed ghost change."""
    gid = (ghost_id or "").strip()
    pending = _ghost_ids(context)
    if not gid or gid not in pending:
        log.warning("commit_ghost_without_preview", ghost_id=gid or None)
        return json.dumps(
            {
                "error": "mutation_commit_without_preview",
                "committed": False,
                "message": "Preview is required before committing this change.",
            },
            ensure_ascii=False,
        )
    pending.discard(gid)
    return json.dumps(
        {"committed": True, "ghost_id": gid, "message": "Preview accepted."},
        ensure_ascii=False,
    )
