"""OpenTelemetry helpers (Sprint-5 #52).

No hard dependency on opentelemetry-sdk — spans are no-ops when the package is
absent. Always propagates a trace_id via contextvars for job_sse_bridge / Celery.
"""

from __future__ import annotations

import contextlib
import contextvars
import os
import uuid
from collections.abc import Iterator
from typing import Any

import structlog

log = structlog.get_logger(__name__)

_trace_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("ceg_trace_id", default="")
_span_ctx_var: contextvars.ContextVar[Any] = contextvars.ContextVar("ceg_otel_span", default=None)

_TRACER: Any | None = None
_INIT = False


def _otel_enabled() -> bool:
    raw = (os.getenv("OTEL_ENABLED") or "").strip().lower()
    if raw in {"0", "false", "no", "off"}:
        return False
    if raw in {"1", "true", "yes", "on"}:
        return True
    # Default on in staging when SDK present; local stays off unless set.
    env = (os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "").strip().lower()
    return env in {"staging", "uat", "production", "prod"}


def _get_tracer() -> Any | None:
    global _TRACER, _INIT
    if _INIT:
        return _TRACER
    _INIT = True
    if not _otel_enabled():
        return None
    try:
        from opentelemetry import trace

        _TRACER = trace.get_tracer("ceg.agent_core")
        return _TRACER
    except ImportError:
        log.debug("opentelemetry_not_installed")
        return None


def current_trace_id() -> str:
    tid = _trace_id_var.get()
    if tid:
        return tid
    return ""


def set_trace_id(trace_id: str | None) -> str:
    tid = (trace_id or "").strip() or str(uuid.uuid4())
    _trace_id_var.set(tid)
    return tid


@contextlib.contextmanager
def span(name: str, *, attributes: dict[str, Any] | None = None) -> Iterator[str]:
    """Create a span (or no-op). Yields trace_id."""
    tid = current_trace_id() or set_trace_id(None)
    tracer = _get_tracer()
    attrs = dict(attributes or {})
    attrs.setdefault("ceg.trace_id", tid)
    if tracer is None:
        log.debug("otel_span_noop", name=name, trace_id=tid)
        yield tid
        return
    try:
        with tracer.start_as_current_span(name, attributes=attrs) as otel_span:
            _span_ctx_var.set(otel_span)
            yield tid
    except Exception as exc:  # noqa: BLE001
        log.debug("otel_span_failed", name=name, error=str(exc))
        yield tid


def inject_trace_into_meta(meta: dict[str, Any] | None) -> dict[str, Any]:
    out = dict(meta or {})
    tid = current_trace_id() or set_trace_id(None)
    out.setdefault("trace_id", tid)
    return out


def adopt_trace_from_meta(meta: dict[str, Any] | None) -> str:
    tid = str((meta or {}).get("trace_id") or "").strip()
    return set_trace_id(tid or None)
