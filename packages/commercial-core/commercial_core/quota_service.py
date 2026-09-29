"""Redis-backed quota enforcement with PostgreSQL write-through."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol

from redis.asyncio import Redis

from commercial_core.platform_bypass import PlatformBypassConfig
from commercial_core.specs import get_default_free_features, get_feature_spec, get_quota_spec

# Atomic check-and-increment via Lua (VAPT: prevent race on quota bypass)
_QUOTA_LUA = """
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local limit = tonumber(ARGV[1])
local increment = tonumber(ARGV[2])
local expire_at = tonumber(ARGV[3])
if limit >= 0 and current + increment > limit then
  return {0, current}
end
local new = redis.call('INCRBY', KEYS[1], increment)
if expire_at > 0 then
  redis.call('EXPIREAT', KEYS[1], expire_at)
end
return {1, new}
"""


class CommercialDataAccess(Protocol):
    async def get_active_subscription(self, tenant_id: str, product: str) -> Any | None: ...

    async def get_plan(self, plan_id: Any) -> Any | None: ...

    async def increment_quota_usage(
        self,
        tenant_id: str,
        product: str,
        metric: str,
        increment_by: int,
        *,
        period_year: int,
        period_month: int,
        period_day: int,
    ) -> None: ...


class QuotaEnforcementService:
    """Central quota enforcement across all products."""

    def __init__(
        self,
        redis: Redis,
        data: CommercialDataAccess,
        *,
        platform_bypass: PlatformBypassConfig | None = None,
    ) -> None:
        self.redis = redis
        self.data = data
        self.platform_bypass = platform_bypass or PlatformBypassConfig.from_env()
        self._lua_sha: str | None = None

    def is_platform_unlimited(
        self,
        tenant_id: str,
        *,
        tenant_slug: str | None = None,
        user_role: str | None = None,
        user_email: str | None = None,
    ) -> bool:
        return self.platform_bypass.is_unlimited(
            tenant_id=tenant_id,
            tenant_slug=tenant_slug,
            user_role=user_role,
            user_email=user_email,
        )

    async def _ensure_lua(self) -> str:
        if not self._lua_sha:
            self._lua_sha = await self.redis.script_load(_QUOTA_LUA)
        return self._lua_sha

    @staticmethod
    def usage_key(tenant_id: str, product: str, metric: str, period: str) -> str:
        now = datetime.now(timezone.utc)
        if period == "daily":
            return f"quota:{tenant_id}:{product}:{metric}:daily:{now.strftime('%Y%m%d')}"
        if period == "monthly":
            return f"quota:{tenant_id}:{product}:{metric}:monthly:{now.strftime('%Y%m')}"
        if period == "annual":
            return f"quota:{tenant_id}:{product}:{metric}:annual:{now.year}"
        return f"quota:{tenant_id}:{product}:{metric}:total"

    @staticmethod
    def period_end_timestamp(period: str) -> int:
        now = datetime.now(timezone.utc)
        if period == "daily":
            end = now.replace(hour=23, minute=59, second=59, microsecond=0)
        elif period == "monthly":
            if now.month == 12:
                end = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                end = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end = end.replace(day=1) - __import__("datetime").timedelta(seconds=1)
        elif period == "annual":
            end = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end = end - __import__("datetime").timedelta(seconds=1)
        else:
            end = now.replace(year=now.year + 10)
        return int(end.timestamp())

    async def get_plan_limit(
        self,
        tenant_id: str,
        product: str,
        metric: str,
        *,
        tenant_slug: str | None = None,
        user_role: str | None = None,
        user_email: str | None = None,
    ) -> int | float:
        if self.is_platform_unlimited(
            tenant_id, tenant_slug=tenant_slug, user_role=user_role, user_email=user_email
        ):
            return -1
        subscription = await self.data.get_active_subscription(tenant_id, product)
        plan_tier = "free"
        quota_overrides: dict = {}

        if subscription:
            if getattr(subscription, "status", "") == "suspended":
                return 0
            plan = await self.data.get_plan(subscription.plan_id)
            if plan:
                plan_tier = plan.tier
            quota_overrides = getattr(subscription, "quota_overrides", {}) or {}

        if metric in quota_overrides:
            return quota_overrides[metric]

        quota_spec = get_quota_spec(product)
        limits = quota_spec.get(metric, {})
        return limits.get(plan_tier, 0)

    async def check_and_increment(
        self,
        tenant_id: str,
        product: str,
        metric: str,
        increment_by: int = 1,
        period: str = "monthly",
        *,
        tenant_slug: str | None = None,
        user_role: str | None = None,
        user_email: str | None = None,
    ) -> tuple[bool, dict[str, Any]]:
        if self.is_platform_unlimited(
            tenant_id, tenant_slug=tenant_slug, user_role=user_role, user_email=user_email
        ):
            await self._track_usage(tenant_id, product, metric, increment_by, period)
            return True, {"limit": -1, "used": None, "unlimited": True, "platform_owner": True}

        limit = await self.get_plan_limit(
            tenant_id, product, metric, tenant_slug=tenant_slug, user_role=user_role
        )

        if limit == -1:
            await self._track_usage(tenant_id, product, metric, increment_by, period)
            return True, {"limit": -1, "used": None, "unlimited": True}

        redis_key = self.usage_key(tenant_id, product, metric, period)
        sha = await self._ensure_lua()
        expire_at = self.period_end_timestamp(period)
        result = await self.redis.evalsha(sha, 1, redis_key, int(limit), increment_by, expire_at)
        allowed = int(result[0]) == 1
        current = int(result[1])

        if not allowed:
            return False, {
                "limit": limit,
                "used": current,
                "remaining": max(0, int(limit) - current),
                "exceeded_by": (current + increment_by) - int(limit),
                "metric": metric,
                "period": period,
                "upgrade_required": True,
            }

        await self._pg_increment(tenant_id, product, metric, increment_by, period)
        return True, {
            "limit": limit,
            "used": current,
            "remaining": int(limit) - current,
            "percent_used": round((current / limit) * 100, 1) if limit > 0 else 0,
        }

    async def _track_usage(
        self, tenant_id: str, product: str, metric: str, increment_by: int, period: str
    ) -> None:
        redis_key = self.usage_key(tenant_id, product, metric, period)
        pipe = self.redis.pipeline()
        pipe.incrby(redis_key, increment_by)
        pipe.expireat(redis_key, self.period_end_timestamp(period))
        await pipe.execute()
        await self._pg_increment(tenant_id, product, metric, increment_by, period)

    async def _pg_increment(
        self, tenant_id: str, product: str, metric: str, increment_by: int, period: str
    ) -> None:
        now = datetime.now(timezone.utc)
        period_month = now.month if period == "monthly" else 0
        period_day = now.day if period == "daily" else 0
        await self.data.increment_quota_usage(
            tenant_id,
            product,
            metric,
            increment_by,
            period_year=now.year,
            period_month=period_month,
            period_day=period_day,
        )

    async def check_feature(
        self,
        tenant_id: str,
        product: str,
        feature: str,
        *,
        tenant_slug: str | None = None,
        user_role: str | None = None,
        user_email: str | None = None,
    ) -> bool:
        if self.is_platform_unlimited(
            tenant_id, tenant_slug=tenant_slug, user_role=user_role, user_email=user_email
        ):
            return True
        cache_key = f"feature:{tenant_id}:{product}:{feature}"
        cached = await self.redis.get(cache_key)
        if cached is not None:
            return cached == b"1"

        subscription = await self.data.get_active_subscription(tenant_id, product)
        enabled = False

        if not subscription or getattr(subscription, "status", "") == "suspended":
            plan_features = get_default_free_features(product)
            enabled = plan_features.get(feature, False)
        else:
            feature_overrides = getattr(subscription, "feature_overrides", {}) or {}
            if feature in feature_overrides:
                enabled = bool(feature_overrides[feature])
            else:
                plan = await self.data.get_plan(subscription.plan_id)
                if plan:
                    enabled = bool(plan.features.get(feature, {}).get(plan.tier, False))

        await self.redis.setex(cache_key, 300, b"1" if enabled else b"0")
        return enabled

    async def invalidate_feature_cache(self, tenant_id: str, product: str) -> None:
        pattern = f"feature:{tenant_id}:{product}:*"
        async for key in self.redis.scan_iter(match=pattern):
            await self.redis.delete(key)

    async def get_usage_summary(
        self,
        tenant_id: str,
        product: str,
        *,
        tenant_slug: str | None = None,
        user_role: str | None = None,
        user_email: str | None = None,
    ) -> dict[str, Any]:
        platform_unlimited = self.is_platform_unlimited(
            tenant_id, tenant_slug=tenant_slug, user_role=user_role, user_email=user_email
        )
        subscription = await self.data.get_active_subscription(tenant_id, product)
        plan_tier = "unlimited" if platform_unlimited else "free"
        quota_overrides: dict = {}
        if subscription and not platform_unlimited:
            plan = await self.data.get_plan(subscription.plan_id)
            if plan:
                plan_tier = plan.tier
            quota_overrides = getattr(subscription, "quota_overrides", {}) or {}

        quota_spec = get_quota_spec(product)
        summary: dict[str, Any] = {}
        for metric, limits in quota_spec.items():
            if platform_unlimited:
                limit = -1
            else:
                limit = quota_overrides.get(metric, limits.get(plan_tier, 0))
            used_monthly = int(await self.redis.get(self.usage_key(tenant_id, product, metric, "monthly")) or 0)
            used_daily = int(await self.redis.get(self.usage_key(tenant_id, product, metric, "daily")) or 0)
            summary[metric] = {
                "limit": limit,
                "unlimited": limit == -1,
                "used_monthly": used_monthly,
                "used_daily": used_daily,
                "percent_used": round((used_monthly / limit) * 100, 1) if isinstance(limit, (int, float)) and limit > 0 else 0,
                "remaining": max(0, int(limit) - used_monthly) if limit != -1 else None,
            }
        return summary
