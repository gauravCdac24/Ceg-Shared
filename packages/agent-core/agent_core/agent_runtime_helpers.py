"""Shared helpers for product agent routers (tenant policy, redis, PDF dispatch)."""

from __future__ import annotations

import os
from collections.abc import Awaitable, Callable
from typing import Any

from agent_core.agent_routes_shared import enrich_context_with_tenant_agent_settings


def _is_non_local_environment() -> bool:
    env = (
        os.getenv("ENVIRONMENT")
        or os.getenv("APP_ENV")
        or os.getenv("CEG_ENV")
        or os.getenv("FETCHDESK_ENV")
        or "development"
    ).strip().lower()
    return env not in {"", "local", "dev", "development", "test"}


def build_agent_context_extras(
    *,
    request_context: dict[str, Any],
    tenant_ai_settings: dict[str, Any] | None = None,
    redis_client: Any | None = None,
    pdf_celery_dispatch: Callable[[str, str, str, str], Any] | None = None,
    **extra: Any,
) -> dict[str, Any]:
    """Build AgentContext.extra with tenant policy and optional multimodal backends."""
    if redis_client is None and _is_non_local_environment():
        raise RuntimeError("Redis is required for agent context outside local/dev/test environments")
    ctx = enrich_context_with_tenant_agent_settings(request_context, tenant_ai_settings)
    out: dict[str, Any] = {"request_context": ctx, **extra}
    if redis_client is not None:
        out["redis"] = redis_client
    if pdf_celery_dispatch is not None:
        out["pdf_celery_dispatch"] = pdf_celery_dispatch
    return out


async def optional_async_redis(get_redis: Callable[..., Any] | None) -> Any | None:
    if get_redis is None:
        return None
    try:
        result = get_redis()
        if hasattr(result, "__await__"):
            return await result
        return result
    except Exception:
        return None


def optional_pdf_dispatch(import_path: str, attr: str = "dispatch_pdf_extract") -> Callable[..., Any] | None:
    """Best-effort import of product Celery PDF dispatch (None when Celery unavailable)."""
    try:
        import importlib

        mod = importlib.import_module(import_path)
        fn = getattr(mod, attr, None)
        return fn if callable(fn) else None
    except Exception:
        return None
