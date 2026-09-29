"""Platform-wide commercial billing toggle (env default + Redis override).

All fleet products that share Redis use the same key so CeG Platform Console
or any product super-admin toggle stays consistent.
"""

from __future__ import annotations

from redis.asyncio import Redis

REDIS_KEY = "platform:commercial:billing_enabled"


def _decode_flag(raw: object, *, env_default: bool) -> bool:
    if raw is None:
        return bool(env_default)
    decoded = raw.decode() if isinstance(raw, bytes) else str(raw)
    return decoded.lower() in {"1", "true", "yes", "on"}


async def is_commercial_billing_enabled(redis: Redis, *, env_default: bool) -> bool:
    return _decode_flag(await redis.get(REDIS_KEY), env_default=env_default)


def is_commercial_billing_enabled_sync(redis: object, *, env_default: bool) -> bool:
    """Sync Redis clients (Cert Studio token-revocation)."""
    getter = getattr(redis, "get", None)
    raw = getter(REDIS_KEY) if callable(getter) else None
    return _decode_flag(raw, env_default=env_default)


async def set_commercial_billing_enabled(redis: Redis, enabled: bool) -> bool:
    await redis.set(REDIS_KEY, "1" if enabled else "0")
    return enabled


def set_commercial_billing_enabled_sync(redis: object, enabled: bool) -> bool:
    setter = getattr(redis, "set", None)
    if callable(setter):
        setter(REDIS_KEY, "1" if enabled else "0")
    return enabled
