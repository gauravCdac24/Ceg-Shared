"""FastAPI decorators for quota and feature enforcement."""

from __future__ import annotations

import inspect
from functools import wraps
from typing import Any, Callable, get_type_hints

from fastapi import HTTPException

from commercial_core.quota_service import QuotaEnforcementService

_MAX_ROW_METRICS = frozenset({"bulk_job_max_rows"})


def _resolve_tenant_id(kwargs: dict[str, Any]) -> str:
    ctx = kwargs.get("ctx")
    if isinstance(ctx, dict) and ctx.get("tenant_id"):
        return str(ctx["tenant_id"])
    principal = kwargs.get("principal")
    if principal is not None:
        tid = getattr(principal, "tenant_id", None)
        if tid:
            return str(tid)
    user = kwargs.get("user") or kwargs.get("current_user")
    if user is not None:
        tid = (
            getattr(user, "effective_tenant_id", None)
            or getattr(user, "tenant_id", None)
            or getattr(user, "organization_id", None)
        )
        if tid:
            return str(tid)
    return ""


def _resolve_tenant_slug(kwargs: dict[str, Any]) -> str | None:
    ctx = kwargs.get("ctx")
    if isinstance(ctx, dict) and ctx.get("tenant_slug"):
        return str(ctx["tenant_slug"])
    user = kwargs.get("user") or kwargs.get("current_user")
    if user is None and isinstance(ctx, dict):
        user = ctx.get("user")
    if user is not None:
        slug = (
            getattr(user, "workspace_tenant_slug", None)
            or getattr(user, "tenant_slug", None)
            or getattr(user, "organization_slug", None)
        )
        if slug:
            return str(slug)
        org = getattr(user, "organization", None)
        if org is not None and getattr(org, "domain_prefix", None):
            return str(org.domain_prefix)
    return None


def _resolve_user_role(kwargs: dict[str, Any]) -> str | None:
    ctx = kwargs.get("ctx")
    if isinstance(ctx, dict) and ctx.get("role"):
        return str(ctx["role"])
    user = kwargs.get("user") or kwargs.get("current_user")
    if user is None and isinstance(ctx, dict):
        user = ctx.get("user")
    if user is not None:
        role = getattr(user, "role", None)
        if role:
            return str(role)
    return None


def _resolve_user_email(kwargs: dict[str, Any]) -> str | None:
    ctx = kwargs.get("ctx")
    if isinstance(ctx, dict) and ctx.get("user_email"):
        return str(ctx["user_email"])
    user = kwargs.get("user") or kwargs.get("current_user")
    if user is None and isinstance(ctx, dict):
        user = ctx.get("user")
    if user is not None:
        email = getattr(user, "email", None)
        if email:
            return str(email)
    return None


def _resolve_increment(kwargs: dict[str, Any], increment_by: int, rows_from: str | None) -> int:
    if not rows_from:
        return increment_by
    body = kwargs.get("body")
    if body is None:
        return increment_by
    if rows_from == "body.rows" and hasattr(body, "rows"):
        return max(1, len(body.rows))
    return increment_by


def _preserve_fastapi_signature(func: Callable, wrapper: Callable) -> Callable:
    """Keep FastAPI dependency injection working on decorated route handlers.

    ``@wraps`` copies string annotations when the handler module uses
    ``from __future__ import annotations``; FastAPI then treats Pydantic models
    as query params. Re-resolve hints and rebuild the signature on the wrapper.
    """
    globalns = getattr(func, "__globals__", None)
    try:
        hints = get_type_hints(func, globalns=globalns, include_extras=True)
    except Exception:
        hints = {}
    try:
        sig = inspect.signature(func)
        params = [
            param.replace(annotation=hints[name])
            if name in hints
            else param
            for name, param in sig.parameters.items()
        ]
        return_ann = hints.get("return", sig.return_annotation)
        wrapper.__signature__ = sig.replace(parameters=params, return_annotation=return_ann)  # type: ignore[attr-defined]
    except (TypeError, ValueError):
        pass
    if hints:
        wrapper.__annotations__ = hints  # type: ignore[attr-defined]
    return wrapper


def require_quota(
    product: str,
    metric: str,
    increment_by: int = 1,
    period: str = "monthly",
    *,
    rows_from: str | None = None,
    max_per_request: bool = False,
) -> Callable:
    """Decorator for FastAPI route handlers that checks quota before proceeding."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            quota_service: QuotaEnforcementService | None = kwargs.get("quota_service")
            if not quota_service:
                raise HTTPException(status_code=500, detail="Quota service not configured")

            tenant_id = _resolve_tenant_id(kwargs)
            if not tenant_id or tenant_id == "None":
                raise HTTPException(status_code=403, detail="Tenant context required")

            tenant_slug = _resolve_tenant_slug(kwargs)
            user_role = _resolve_user_role(kwargs)
            user_email = _resolve_user_email(kwargs)

            is_max_rows = max_per_request or metric in _MAX_ROW_METRICS
            inc = _resolve_increment(kwargs, increment_by, rows_from)

            if is_max_rows:
                limit = await quota_service.get_plan_limit(
                    tenant_id,
                    product,
                    metric,
                    tenant_slug=tenant_slug,
                    user_role=user_role,
                    user_email=user_email,
                )
                if limit != -1 and inc > int(limit):
                    raise HTTPException(
                        status_code=402,
                        detail={
                            "error": "quota_exceeded",
                            "message": f"Maximum {int(limit)} rows per job on your current plan.",
                            "limit": limit,
                            "used": inc,
                            "upgrade_url": "/billing/upgrade",
                            "metric": metric,
                        },
                    )
                return await func(*args, **kwargs)

            allowed, context = await quota_service.check_and_increment(
                tenant_id=tenant_id,
                product=product,
                metric=metric,
                increment_by=inc,
                period=period,
                tenant_slug=tenant_slug,
                user_role=user_role,
                user_email=user_email,
            )
            if not allowed:
                raise HTTPException(
                    status_code=402,
                    detail={
                        "error": "quota_exceeded",
                        "message": f"You have reached your {metric.replace('_', ' ')} limit for this period.",
                        "limit": context["limit"],
                        "used": context["used"],
                        "upgrade_url": "/billing/upgrade",
                        "metric": metric,
                    },
                )
            kwargs["quota_context"] = context
            if "quota_context" not in inspect.signature(func).parameters:
                kwargs.pop("quota_context", None)
            return await func(*args, **kwargs)

        return _preserve_fastapi_signature(func, wrapper)

    return decorator


def require_feature(product: str, feature: str) -> Callable:
    """Decorator for feature flag enforcement."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            quota_service: QuotaEnforcementService | None = kwargs.get("quota_service")
            if not quota_service:
                raise HTTPException(status_code=500, detail="Quota service not configured")

            tenant_id = _resolve_tenant_id(kwargs)
            if not tenant_id or tenant_id == "None":
                raise HTTPException(status_code=403, detail="Tenant context required")

            tenant_slug = _resolve_tenant_slug(kwargs)
            user_role = _resolve_user_role(kwargs)
            user_email = _resolve_user_email(kwargs)

            enabled = await quota_service.check_feature(
                tenant_id=tenant_id,
                product=product,
                feature=feature,
                tenant_slug=tenant_slug,
                user_role=user_role,
                user_email=user_email,
            )
            if not enabled:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "feature_not_available",
                        "message": "This feature is not available on your current plan.",
                        "feature": feature,
                        "upgrade_url": "/billing/upgrade",
                    },
                )
            return await func(*args, **kwargs)

        return _preserve_fastapi_signature(func, wrapper)

    return decorator
