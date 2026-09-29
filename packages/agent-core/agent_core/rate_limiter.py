"""Redis-backed token-bucket rate limiter for agent stream starts (Sprint-4 #3/#44).

Env:
  AGENT_STREAM_RATE_TOKENS_PER_SEC  — refill rate (default 1.0)
  AGENT_STREAM_RATE_BURST           — bucket capacity (default 10)
  AGENT_STREAM_RATE_ENABLED         — set 0/false to disable (default on when Redis present)
"""

from __future__ import annotations

import os
import time
from typing import Any

import structlog

log = structlog.get_logger(__name__)

_PROD_ENVS = frozenset({"production", "prod", "uat", "staging"})


def _is_production_env() -> bool:
    return os.environ.get("ENVIRONMENT", "development").lower() in _PROD_ENVS

_LUA_TOKEN_BUCKET = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local burst = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])
if tokens == nil then
  tokens = burst
  ts = now
end
local elapsed = math.max(0, now - ts)
tokens = math.min(burst, tokens + elapsed * rate)
local allowed = 0
local retry_after = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
else
  retry_after = math.ceil((cost - tokens) / rate)
end
redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', key, math.max(60, math.ceil(burst / rate) * 2))
return {allowed, tokens, retry_after}
"""


def _enabled() -> bool:
    raw = (os.getenv("AGENT_STREAM_RATE_ENABLED") or "true").strip().lower()
    return raw not in {"0", "false", "no", "off"}


def _rate() -> float:
    try:
        return max(0.1, float(os.getenv("AGENT_STREAM_RATE_TOKENS_PER_SEC") or "1.0"))
    except ValueError:
        return 1.0


def _burst() -> float:
    try:
        return max(1.0, float(os.getenv("AGENT_STREAM_RATE_BURST") or "10"))
    except ValueError:
        return 10.0


def _key(tenant_id: str) -> str:
    tid = (tenant_id or "anonymous").strip() or "anonymous"
    return f"agent:stream_rate:{tid}"


async def check_stream_rate_limit(
    redis_client: Any,
    tenant_id: str,
    *,
    cost: float = 1.0,
) -> tuple[bool, float]:
    """Return (allowed, retry_after_sec). Fail-open in dev; fail-closed in production on Redis errors."""
    if not _enabled() or redis_client is None:
        return True, 0.0
    rate = _rate()
    burst = _burst()
    key = _key(tenant_id)
    now = time.time()
    try:
        if hasattr(redis_client, "eval"):
            maybe = redis_client.eval(_LUA_TOKEN_BUCKET, 1, key, now, rate, burst, cost)
            if hasattr(maybe, "__await__"):
                maybe = await maybe
            allowed = int(maybe[0]) == 1
            retry_after = float(maybe[2] or 0)
            if not allowed:
                log.warning(
                    "stream_rate_limited",
                    tenant_id=tenant_id,
                    retry_after_sec=retry_after,
                    rate=rate,
                    burst=burst,
                )
            return allowed, retry_after
        # Fallback: fixed window counter when eval unavailable
        window_key = f"{key}:w:{int(now // 60)}"
        limit = int(burst + rate * 60)
        if hasattr(redis_client, "incr"):
            count = redis_client.incr(window_key)
            if hasattr(count, "__await__"):
                count = await count
            if hasattr(redis_client, "expire"):
                exp = redis_client.expire(window_key, 120)
                if hasattr(exp, "__await__"):
                    await exp
            if int(count) > limit:
                return False, 60.0
            return True, 0.0
    except Exception as exc:  # noqa: BLE001
        log.warning("stream_rate_limit_error", error=str(exc), tenant_id=tenant_id)
        if _is_production_env():
            return False, 60.0
        return True, 0.0
    return True, 0.0


class InMemoryTokenBucket:
    """Test double — process-local token bucket (not for multi-worker prod)."""

    def __init__(self, *, rate: float = 1.0, burst: float = 10.0) -> None:
        self.rate = rate
        self.burst = burst
        self._state: dict[str, tuple[float, float]] = {}

    def allow(self, tenant_id: str, *, cost: float = 1.0) -> tuple[bool, float]:
        now = time.time()
        tokens, ts = self._state.get(tenant_id, (self.burst, now))
        tokens = min(self.burst, tokens + (now - ts) * self.rate)
        if tokens >= cost:
            self._state[tenant_id] = (tokens - cost, now)
            return True, 0.0
        retry = (cost - tokens) / self.rate if self.rate else 60.0
        self._state[tenant_id] = (tokens, now)
        return False, retry
