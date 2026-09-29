"""Shared FastAPI dependencies for product backends (quota + optional platform DB)."""

from __future__ import annotations

import os
from typing import Annotated, Any

from fastapi import Depends
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from commercial_core.models import Plan, QuotaUsage, Subscription
from commercial_core.platform_bypass import PlatformBypassConfig
from commercial_core.quota_service import QuotaEnforcementService

_platform_engine: Any = None
_platform_session_factory: async_sessionmaker[AsyncSession] | None = None
_redis_client: Redis | None = None


def platform_commercial_database_url() -> str | None:
    url = (os.getenv("PLATFORM_COMMERCIAL_DATABASE_URL") or "").strip()
    return url or None


def _session_factory() -> async_sessionmaker[AsyncSession] | None:
    global _platform_engine, _platform_session_factory
    url = platform_commercial_database_url()
    if not url:
        return None
    if _platform_session_factory is None:
        _platform_engine = create_async_engine(url, pool_pre_ping=True)
        _platform_session_factory = async_sessionmaker(_platform_engine, expire_on_commit=False)
    return _platform_session_factory


class NoOpCommercialData:
    """Free-tier enforcement via specs when platform commercial DB is not linked."""

    async def get_active_subscription(self, tenant_id: str, product: str) -> Any | None:
        return None

    async def get_plan(self, plan_id: Any) -> Any | None:
        return None

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
    ) -> None:
        return None


class PlatformCommercialData:
    """Read subscriptions/plans from shared platform_commercial schema."""

    def __init__(self, factory: async_sessionmaker[AsyncSession]) -> None:
        self._factory = factory

    async def get_active_subscription(self, tenant_id: str, product: str) -> Any | None:
        async with self._factory() as db:
            return await db.scalar(
                select(Subscription)
                .where(
                    Subscription.tenant_id == tenant_id,
                    Subscription.product == product,
                    Subscription.status.in_(("active", "trialing", "waived", "past_due")),
                )
                .limit(1)
            )

    async def get_plan(self, plan_id: Any) -> Any | None:
        async with self._factory() as db:
            return await db.get(Plan, plan_id)

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
    ) -> None:
        async with self._factory() as db:
            row = await db.scalar(
                select(QuotaUsage)
                .where(
                    QuotaUsage.tenant_id == tenant_id,
                    QuotaUsage.product == product,
                    QuotaUsage.metric == metric,
                    QuotaUsage.period_year == period_year,
                    QuotaUsage.period_month == period_month,
                    QuotaUsage.period_day == period_day,
                )
                .limit(1)
            )
            if row:
                row.count += increment_by
            else:
                db.add(
                    QuotaUsage(
                        tenant_id=tenant_id,
                        product=product,
                        metric=metric,
                        period_year=period_year,
                        period_month=period_month,
                        period_day=period_day,
                        count=increment_by,
                    )
                )
            await db.commit()


def redis_url() -> str:
    return (os.getenv("REDIS_URL") or "redis://localhost:6379/0").strip()


async def get_redis_client() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(redis_url(), decode_responses=False)
    return _redis_client


def build_quota_service(
    redis: Redis,
    *,
    platform_bypass: PlatformBypassConfig | None = None,
) -> QuotaEnforcementService:
    factory = _session_factory()
    data: Any = PlatformCommercialData(factory) if factory else NoOpCommercialData()
    bypass = platform_bypass or PlatformBypassConfig.from_env()
    return QuotaEnforcementService(redis, data, platform_bypass=bypass)


async def get_quota_service(redis: Redis = Depends(get_redis_client)) -> QuotaEnforcementService:
    return build_quota_service(redis)


async def resolve_quota_service() -> QuotaEnforcementService:
    """Build quota service outside FastAPI DI (scripts, nested helpers)."""
    return build_quota_service(await get_redis_client())


QuotaSvc = Annotated[QuotaEnforcementService, Depends(get_quota_service)]
