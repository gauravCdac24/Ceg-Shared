"""Fleet commercial billing toggle (env default + Redis override)."""

from __future__ import annotations

import pytest

from commercial_core.billing_settings import (
    REDIS_KEY,
    is_commercial_billing_enabled,
    set_commercial_billing_enabled,
)


class _FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def get(self, key: str):
        val = self.store.get(key)
        return val.encode() if val is not None else None

    async def set(self, key: str, value: str) -> None:
        self.store[key] = value


@pytest.mark.asyncio
async def test_env_default_when_redis_empty() -> None:
    redis = _FakeRedis()
    assert await is_commercial_billing_enabled(redis, env_default=False) is False
    assert await is_commercial_billing_enabled(redis, env_default=True) is True


@pytest.mark.asyncio
async def test_redis_override_wins() -> None:
    redis = _FakeRedis()
    await set_commercial_billing_enabled(redis, True)
    assert redis.store[REDIS_KEY] == "1"
    assert await is_commercial_billing_enabled(redis, env_default=False) is True
    await set_commercial_billing_enabled(redis, False)
    assert await is_commercial_billing_enabled(redis, env_default=True) is False
