"""Tests for agent_runtime_helpers."""

from __future__ import annotations

import pytest

from agent_core.agent_runtime_helpers import (
    build_agent_context_extras,
    optional_async_redis,
    optional_pdf_dispatch,
)


def test_build_agent_context_extras_merges_tenant_policy():
    extras = build_agent_context_extras(
        request_context={"foo": 1},
        tenant_ai_settings={"agent_capabilities": {"web_search_default": True}},
        redis_client={"mock": True},
        pdf_celery_dispatch=lambda *a: None,
        event_sink=[],
    )
    assert extras["request_context"]["foo"] == 1
    assert extras["request_context"]["tenant_agent_capabilities"]["web_search_default"] is True
    assert extras["redis"] == {"mock": True}
    assert callable(extras["pdf_celery_dispatch"])
    assert extras["event_sink"] == []


def test_build_agent_context_extras_requires_redis_outside_local(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(RuntimeError):
        build_agent_context_extras(request_context={"foo": 1}, redis_client=None)


@pytest.mark.asyncio
async def test_optional_async_redis_sync_callable():
    async def _bad():
        raise RuntimeError("nope")

    assert await optional_async_redis(lambda: {"ok": True}) == {"ok": True}
    assert await optional_async_redis(_bad) is None
    assert await optional_async_redis(None) is None


def test_optional_pdf_dispatch_missing_module():
    assert optional_pdf_dispatch("no.such.module.ever") is None
