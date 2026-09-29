"""Optional Langfuse / observability hooks (Phase 2 / Sprint-5).

Langfuse network I/O is always off the request path (thread pool).
Never transmits raw prompt/completion bodies — metadata only.
#53 LangSmith: not adopted; Langfuse is the supported path.
"""

from __future__ import annotations

import concurrent.futures
import os
import uuid
from typing import TYPE_CHECKING, Any

import structlog

if TYPE_CHECKING:
    from agent_core.audit_logger import AgentAuditEntry
    from agent_core.turn_router import RoutingDecision

log = structlog.get_logger(__name__)

_langfuse_client: Any | None = None
_trace_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=2, thread_name_prefix="langfuse-trace"
)

# Forbidden keys — assert never shipped to Langfuse metadata.
_PII_FORBIDDEN = frozenset(
    {
        "prompt",
        "completion",
        "messages",
        "input",
        "output",
        "raw_prompt",
        "user_message",
        "system_prompt",
        "body",
    }
)


def langfuse_enabled() -> bool:
    """True when explicitly enabled, or staging default with keys present."""
    raw = (os.getenv("LANGFUSE_ENABLED") or "").strip().lower()
    if raw in {"0", "false", "no", "off"}:
        return False
    if raw in {"1", "true", "yes", "on"}:
        return True
    env = (os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "").strip().lower()
    if env in {"staging", "uat"}:
        # Sprint-5 #54: default on in staging when keys exist.
        return bool(
            (os.getenv("LANGFUSE_SECRET_KEY") or "").strip()
            and (os.getenv("LANGFUSE_PUBLIC_KEY") or "").strip()
        )
    return False


def sanitize_langfuse_metadata(meta: dict[str, Any]) -> dict[str, Any]:
    """Drop any prompt-like keys before Langfuse transmit."""
    out: dict[str, Any] = {}
    for k, v in (meta or {}).items():
        key = str(k).lower()
        if key in _PII_FORBIDDEN or "prompt" in key and key not in {"prompt_hash", "prompt_id", "prompt_version"}:
            continue
        if isinstance(v, str) and len(v) > 500:
            out[k] = v[:500] + "…"
        else:
            out[k] = v
    return out


def _get_langfuse() -> Any | None:
    global _langfuse_client
    if _langfuse_client is not None:
        return _langfuse_client
    if not langfuse_enabled():
        return None
    secret = os.getenv("LANGFUSE_SECRET_KEY", "").strip()
    public = os.getenv("LANGFUSE_PUBLIC_KEY", "").strip()
    host = os.getenv("LANGFUSE_HOST", "http://localhost:3101").strip()
    if not secret or not public:
        return None
    try:
        from langfuse import Langfuse

        _langfuse_client = Langfuse(secret_key=secret, public_key=public, host=host)
        return _langfuse_client
    except ImportError:
        log.info("langfuse_not_installed")
        return None
    except Exception as exc:
        log.warning("langfuse_init_failed", error=str(exc))
        return None


def _trace_agent_turn_sync(entry: "AgentAuditEntry") -> None:
    """Blocking Langfuse write — only called from the background executor."""
    client = _get_langfuse()
    if client is None:
        return
    try:
        metadata = sanitize_langfuse_metadata(
            {
                "tenant_id": entry.tenant_id,
                "mode": entry.mode,
                "intent": entry.intent,
                "tools": entry.tools_called,
                "model": entry.model_used,
                "byo": entry.byo_model,
                "prompt_hash": entry.prompt_hash,
                "prompt_id": getattr(entry, "prompt_id", None),
                "prompt_version": getattr(entry, "prompt_version", None),
            }
        )
        trace = client.trace(
            name=f"{entry.product}_agent_turn",
            session_id=entry.session_id,
            user_id=entry.user_id,
            metadata=metadata,
        )
        trace.generation(
            name="agent_turn",
            model=entry.model_used or "unknown",
            metadata=sanitize_langfuse_metadata(
                {"latency_ms": entry.latency_ms, "error": entry.error}
            ),
        )
    except Exception as exc:
        log.warning("langfuse_trace_failed", error=str(exc))


def trace_agent_turn(entry: "AgentAuditEntry") -> None:
    """Best-effort Langfuse trace (no raw prompts). Never blocks the caller."""
    if not langfuse_enabled():
        return
    try:
        _trace_executor.submit(_trace_agent_turn_sync, entry)
    except Exception as exc:
        log.warning("langfuse_schedule_failed", error=str(exc))


def log_turn_router_decision(
    decision: "RoutingDecision",
    *,
    trace_id: str | None = None,
    model_used: str | None = None,
) -> str:
    """Mandatory structlog on every turn_router.route() — independent of Langfuse."""
    tid = trace_id or str(uuid.uuid4())
    log.info(
        "turn_router_route",
        trace_id=tid,
        intent=decision.intent.value,
        confidence=decision.confidence,
        path=decision.path,
        state=decision.state.value,
        reason=decision.reason,
        model_used=model_used or "",
    )
    return tid
