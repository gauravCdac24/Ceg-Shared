"""Unit tests for commercial FastAPI decorators."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from commercial_core.decorators import require_quota
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


class _FakeData:
    async def get_active_subscription(self, tenant_id: str, product: str):
        return None

    async def get_plan(self, plan_id):
        return None

    async def increment_quota_usage(self, *a, **k) -> None:
        pass


@pytest.mark.asyncio
async def test_require_quota_drops_context_when_handler_does_not_accept_it() -> None:
    svc = QuotaEnforcementService(_FakeRedis(), _FakeData())  # type: ignore[arg-type]

    @require_quota("fetchdesk", "crawls_per_day", period="daily")
    async def handler(*, user: object, quota_service: QuotaEnforcementService):
        return "ok"

    class _User:
        tenant_id = "org-1"

    result = await handler(user=_User(), quota_service=svc)
    assert result == "ok"


@pytest.mark.asyncio
async def test_require_quota_resolves_effective_tenant_on_user() -> None:
    svc = QuotaEnforcementService(_FakeRedis(), _FakeData())  # type: ignore[arg-type]

    @require_quota("fetchdesk", "crawls_per_day", period="daily")
    async def handler(*, user: object, quota_service: QuotaEnforcementService):
        return "ok"

    class _User:
        tenant_id = None
        effective_tenant_id = "workspace-tenant-1"

    result = await handler(user=_User(), quota_service=svc)
    assert result == "ok"


@pytest.mark.asyncio
async def test_require_quota_resolves_ctx_tenant() -> None:
    svc = QuotaEnforcementService(_FakeRedis(), _FakeData())  # type: ignore[arg-type]

    @require_quota("cert_studio", "cert_generated_monthly")
    async def handler(*, ctx: dict, quota_service: QuotaEnforcementService, quota_context: dict | None = None):
        return "ok"

    result = await handler(ctx={"tenant_id": "org-ctx"}, quota_service=svc)
    assert result == "ok"


@pytest.mark.asyncio
async def test_require_quota_resolves_integration_principal() -> None:
    """API-key integration routes pass principal=, not user= (CeG→Cert jobs)."""
    svc = QuotaEnforcementService(_FakeRedis(), _FakeData())  # type: ignore[arg-type]

    @require_quota("cert_studio", "bulk_job_max_rows", max_per_request=True, rows_from="body.rows")
    async def handler(*, principal: object, body: object, quota_service: QuotaEnforcementService):
        return "ok"

    class _Principal:
        tenant_id = "tenant-from-api-key"

    class _Body:
        rows = [{"a": 1}]

    result = await handler(principal=_Principal(), body=_Body(), quota_service=svc)
    assert result == "ok"


@pytest.mark.asyncio
async def test_require_quota_bulk_max_rows() -> None:
    svc = QuotaEnforcementService(_FakeRedis(), _FakeData())  # type: ignore[arg-type]

    class Body:
        rows = [{"a": 1}] * 100

    @require_quota("cert_studio", "bulk_job_max_rows", max_per_request=True, rows_from="body.rows")
    async def handler(*, body: Body, ctx: dict, quota_service: QuotaEnforcementService, quota_context: dict | None = None):
        return "ok"

    with pytest.raises(HTTPException) as exc:
        await handler(body=Body(), ctx={"tenant_id": "org-1"}, quota_service=svc)
    assert exc.value.status_code == 402
