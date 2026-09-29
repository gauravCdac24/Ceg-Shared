"""Load versioned prompt markdown from packages/agent-core/prompts/."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    from agent_core.turn_router import RoutingDecision

log = structlog.get_logger(__name__)

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
_LOGGED_AT_STARTUP: set[str] = set()
_VERSION_RE = re.compile(r"^(?P<stem>.+?)_v(?P<ver>\d+)(?:\.md)?$", re.IGNORECASE)


@dataclass(frozen=True)
class LoadedPrompt:
    """Prompt text plus registry identity for LLM call telemetry (Sprint-3 #12/#14)."""

    text: str
    prompt_id: str
    prompt_version: str
    name: str
    path: str
    sha256: str


def prompts_dir() -> Path:
    return _PROMPTS_DIR


def prompt_sha256(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def parse_prompt_identity(name: str) -> tuple[str, str]:
    """Derive (prompt_id, prompt_version) from a registry path like ``certstudio/write_text_v1.md``."""
    rel = name.replace("\\", "/").strip().lstrip("/")
    if rel.endswith(".md"):
        rel = rel[:-3]
    parts = rel.split("/")
    leaf = parts[-1]
    m = _VERSION_RE.match(leaf)
    if m:
        stem = m.group("stem")
        ver = f"v{m.group('ver')}"
        prompt_id = "/".join([*parts[:-1], stem]) if len(parts) > 1 else stem
        return prompt_id, ver
    prompt_id = rel
    return prompt_id, "v0"


def _resolve_path(name: str) -> Path:
    rel = name.replace("\\", "/").strip().lstrip("/")
    if not rel.endswith(".md") and not rel.endswith(".bak"):
        rel = f"{rel}.md"
    return _PROMPTS_DIR / rel


@lru_cache(maxsize=64)
def load_prompt_meta(name: str, *, fallback: str = "") -> LoadedPrompt:
    """Load prompt file and return text + prompt_id/version metadata."""
    path = _resolve_path(name)
    prompt_id, prompt_version = parse_prompt_identity(name)
    if path.is_file():
        raw = path.read_text(encoding="utf-8")
        text = raw.strip()
        return LoadedPrompt(
            text=text,
            prompt_id=prompt_id,
            prompt_version=prompt_version,
            name=name if name.endswith((".md", ".bak")) else f"{name}.md",
            path=str(path),
            sha256=prompt_sha256(raw),
        )
    if fallback:
        log.warning("prompt_file_missing_using_fallback", name=name, path=str(path))
        fb = fallback.strip()
        return LoadedPrompt(
            text=fb,
            prompt_id=prompt_id,
            prompt_version=prompt_version,
            name=name,
            path=str(path),
            sha256=prompt_sha256(fb),
        )
    raise FileNotFoundError(f"Prompt not found: {path}")


@lru_cache(maxsize=64)
def load_prompt(name: str, *, fallback: str = "") -> str:
    """Load a prompt file by basename or product path (e.g. ``certstudio/write_text_v1.md``)."""
    return load_prompt_meta(name, fallback=fallback).text


def intent_prompt_name(decision: RoutingDecision | None) -> str:
    """Return the single role prompt file for this turn (deer-flow pattern 1)."""
    from agent_core.query_preprocessor import TaskIntent
    from agent_core.turn_router import ConversationState

    if decision is None:
        return "cleo_system_v1.md"
    if decision.path == "chat" or decision.intent == TaskIntent.conversational:
        return "cleo_system_v1.md"
    if decision.state == ConversationState.recovery:
        return "recovery_v1.md"
    if decision.state == ConversationState.plan or decision.path == "plan":
        return "planner_v1.md"
    if decision.intent in {
        TaskIntent.create,
        TaskIntent.edit,
        TaskIntent.bulk,
        TaskIntent.bulk_operation,
    }:
        return "executor_v1.md"
    if decision.path == "ask" or decision.intent == TaskIntent.question:
        return "cleo_system_v1.md"
    return "cleo_system_v1.md"


def load_prompt_for_intent(decision: RoutingDecision | None, *, fallback: str = "") -> str:
    """Load only the prompt matching ``decision.intent`` / path for this turn."""
    name = intent_prompt_name(decision)
    _log_prompt_first_use(name)
    return load_prompt(name, fallback=fallback)


def _log_prompt_first_use(name: str) -> None:
    if name in _LOGGED_AT_STARTUP:
        return
    try:
        meta = load_prompt_meta(name)
    except FileNotFoundError:
        log.warning("prompt_registry_missing", name=name, path=str(_resolve_path(name)))
        _LOGGED_AT_STARTUP.add(name)
        return
    log.info(
        "prompt_registry",
        name=meta.name,
        prompt_id=meta.prompt_id,
        prompt_version=meta.prompt_version,
        sha256=meta.sha256,
        bytes=len(meta.text.encode("utf-8")),
        path=meta.path,
    )
    _LOGGED_AT_STARTUP.add(name)


def log_prompt_registry_at_startup(*names: str) -> None:
    """Emit SHA256 for each prompt at process startup (audit / drift detection)."""
    for name in names:
        _log_prompt_first_use(name)
