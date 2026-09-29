"""Platform-owner unlimited bypass tests."""

from __future__ import annotations

import pytest

from commercial_core.platform_bypass import PlatformBypassConfig
from commercial_core.quota_service import QuotaEnforcementService


class _FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, int] = {}
        self._sha = "sha"

    async def script_load(self, _script: str) -> str:
        return self._sha

    async def evalsha(self, _sha: str, _n: int, key: str, limit: int, inc: int, _exp: int) -> list[int]:
        cur = self.store.get(key, 0)
        if limit >= 0 and cur + inc > limit:
            return [0, cur]
        self.store[key] = cur + inc
        return [1, self.store[key]]

    async def get(self, key: str):
        val = self.store.get(key)
        return str(val).encode() if val is not None else None

    async def setex(self, *_a, **_k) -> None:
        pass

    async def scan_iter(self, **_k):
        return
        yield  # pragma: no cover

    async def delete(self, *_a) -> None:
        pass

    async def incrby(self, key: str, inc: int) -> int:
        self.store[key] = self.store.get(key, 0) + inc
        return self.store[key]

    async def expireat(self, *_a, **_k) -> None:
        pass

    def pipeline(self):
        return self

    async def execute(self):
        return []


class _FakeData:
    async def get_active_subscription(self, tenant_id: str, product: str):
        return None

    async def get_plan(self, plan_id):
        return None

    async def increment_quota_usage(self, *a, **k) -> None:
        pass


@pytest.mark.asyncio
async def test_platform_owner_slug_bypasses_quota() -> None:
    bypass = PlatformBypassConfig(enabled=True, tenant_slugs=frozenset({"ceg"}))
    svc = QuotaEnforcementService(_FakeRedis(), _FakeData(), platform_bypass=bypass)  # type: ignore[arg-type]
    for _ in range(200):
        ok, ctx = await svc.check_and_increment(
            "tenant-1", "cert_studio", "cert_generated_monthly", tenant_slug="ceg"
        )
        assert ok is True
        assert ctx.get("unlimited") is True


@pytest.mark.asyncio
async def test_non_platform_tenant_still_limited() -> None:
    bypass = PlatformBypassConfig(enabled=True, tenant_slugs=frozenset({"ceg"}))
    svc = QuotaEnforcementService(_FakeRedis(), _FakeData(), platform_bypass=bypass)  # type: ignore[arg-type]
    ok, ctx = await svc.check_and_increment(
        "tenant-2", "cert_studio", "cert_generated_monthly", tenant_slug="customer-org"
    )
    assert ok is True
    assert ctx.get("unlimited") is not True
    ok2, ctx2 = await svc.check_and_increment(
        "tenant-2", "cert_studio", "cert_generated_monthly", tenant_slug="customer-org"
    )
    # free tier limit is 50 — second call still ok, but not unlimited flag
    assert ok2 is True
    assert ctx2.get("unlimited") is not True


@pytest.mark.asyncio
async def test_superadmin_role_bypasses_features() -> None:
    bypass = PlatformBypassConfig(enabled=True, tenant_slugs=frozenset({"ceg"}))
    svc = QuotaEnforcementService(_FakeRedis(), _FakeData(), platform_bypass=bypass)  # type: ignore[arg-type]
    enabled = await svc.check_feature(
        "any-tenant", "cert_studio", "ai_template_generation", user_role="superadmin"
    )
    assert enabled is True


@pytest.mark.asyncio
async def test_dev_email_bypasses_quota() -> None:
    bypass = PlatformBypassConfig(
        enabled=False,
        tenant_slugs=frozenset(),
        dev_unlimited_emails=frozenset({"dev@ceg.gov.in"}),
    )
    svc = QuotaEnforcementService(_FakeRedis(), _FakeData(), platform_bypass=bypass)  # type: ignore[arg-type]
    ok, ctx = await svc.check_and_increment(
        "tenant-x",
        "cert_studio",
        "cert_generated_monthly",
        tenant_slug="customer-org",
        user_email="dev@ceg.gov.in",
    )
    assert ok is True
    assert ctx.get("unlimited") is True


@pytest.mark.asyncio
async def test_bypass_disabled_respects_free_tier() -> None:
    bypass = PlatformBypassConfig(enabled=False, tenant_slugs=frozenset({"ceg"}))
    svc = QuotaEnforcementService(_FakeRedis(), _FakeData(), platform_bypass=bypass)  # type: ignore[arg-type]
    enabled = await svc.check_feature("t1", "cert_studio", "ai_template_generation", tenant_slug="ceg")
    assert enabled is False
