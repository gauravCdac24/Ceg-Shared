"""Simple Redis key naming helpers for login jail / throttle patterns."""

from __future__ import annotations

from ceg_auth.config import AuthProductConfig


def _norm(value: str | None, default: str = "global") -> str:
    raw = (value or default).strip().lower()
    return raw or default


def jail_fail_key(
    config: AuthProductConfig,
    *,
    tenant: str | None,
    username: str,
) -> str:
    """Failure counter key: ``{product}:login_jail:fail:{tenant}:{username}``."""
    t, u = _norm(tenant), _norm(username, default="")
    return f"{config.redis_prefix()}:login_jail:fail:{t}:{u}"


def jail_lock_key(
    config: AuthProductConfig,
    *,
    tenant: str | None,
    username: str,
) -> str:
    """Lock key: ``{product}:login_jail:lock:{tenant}:{username}``."""
    t, u = _norm(tenant), _norm(username, default="")
    return f"{config.redis_prefix()}:login_jail:lock:{t}:{u}"


def jail_keys(
    config: AuthProductConfig,
    *,
    tenant: str | None,
    username: str,
) -> tuple[str, str]:
    return (
        jail_fail_key(config, tenant=tenant, username=username),
        jail_lock_key(config, tenant=tenant, username=username),
    )


def throttle_key(
    config: AuthProductConfig,
    *,
    scope: str,
    identifier: str,
) -> str:
    """Generic throttle key: ``{product}:throttle:{scope}:{identifier}``."""
    return f"{config.redis_prefix()}:throttle:{_norm(scope)}:{_norm(identifier)}"
