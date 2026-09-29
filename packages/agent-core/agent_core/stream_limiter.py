"""Redis-backed concurrent agent stream slots (per-tenant + global).

ponytail: INCR/DECR counters; upgrade to Redis Redlock if multi-region.
"""

from __future__ import annotations

import os
import uuid
from typing import Any


class StreamSlotExhausted(Exception):
    """Raised when tenant or global concurrent stream limit is hit."""

    def __init__(self, *, scope: str, limit: int) -> None:
        self.scope = scope
        self.limit = limit
        super().__init__(f"agent stream slot exhausted ({scope} limit={limit})")


def _max_tenant() -> int:
    try:
        return max(1, int(os.getenv("AGENT_MAX_CONCURRENT_STREAMS_PER_TENANT", "5")))
    except ValueError:
        return 5


def _max_global() -> int:
    try:
        return max(1, int(os.getenv("AGENT_MAX_CONCURRENT_STREAMS_GLOBAL", "40")))
    except ValueError:
        return 40


def _ttl_sec() -> int:
    # Auto-expire stuck counters if release never runs (crash mid-stream).
    try:
        return max(60, int(os.getenv("AGENT_STREAM_SLOT_TTL_SEC", "900")))
    except ValueError:
        return 900


async def acquire_agent_stream_slot(
    redis: Any,
    *,
    tenant_id: str,
    product: str = "agent",
) -> str:
    """Reserve a stream slot. Returns lease_id for release."""
    if redis is None:
        return ""
    lease = str(uuid.uuid4())
    ttl = _ttl_sec()
    tenant_key = f"agent:streams:{product}:tenant:{tenant_id}"
    global_key = f"agent:streams:{product}:global"
    lease_key = f"agent:streams:{product}:lease:{lease}"

    tenant_n = await redis.incr(tenant_key)
    await redis.expire(tenant_key, ttl)
    if int(tenant_n) > _max_tenant():
        await redis.decr(tenant_key)
        raise StreamSlotExhausted(scope="tenant", limit=_max_tenant())

    global_n = await redis.incr(global_key)
    await redis.expire(global_key, ttl)
    if int(global_n) > _max_global():
        await redis.decr(global_key)
        await redis.decr(tenant_key)
        raise StreamSlotExhausted(scope="global", limit=_max_global())

    # Track lease metadata so release is idempotent and crash-safe.
    await redis.setex(
        lease_key,
        ttl,
        f"{tenant_id}|{product}",
    )
    return lease


async def release_agent_stream_slot(
    redis: Any,
    lease_id: str,
    *,
    tenant_id: str,
    product: str = "agent",
) -> None:
    if redis is None or not lease_id:
        return
    lease_key = f"agent:streams:{product}:lease:{lease_id}"
    try:
        existed = await redis.delete(lease_key)
    except Exception:
        existed = 0
    if not existed:
        return
    tenant_key = f"agent:streams:{product}:tenant:{tenant_id}"
    global_key = f"agent:streams:{product}:global"
    try:
        n = await redis.decr(tenant_key)
        if int(n) < 0:
            await redis.set(tenant_key, 0)
        g = await redis.decr(global_key)
        if int(g) < 0:
            await redis.set(global_key, 0)
    except Exception:
        pass
