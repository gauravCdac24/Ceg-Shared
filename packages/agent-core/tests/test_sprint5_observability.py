"""Sprint-5 observability unit tests."""

from __future__ import annotations

import os

from agent_core.cost_ledger import (
    clear_ledger_for_tests,
    compute_cost_usd,
    record_llm_cost,
    tenant_cost_summary,
)
from agent_core.observability import langfuse_enabled, sanitize_langfuse_metadata
from agent_core.otel import current_trace_id, inject_trace_into_meta, set_trace_id, span


def test_langfuse_metadata_strips_prompt_bodies():
    cleaned = sanitize_langfuse_metadata(
        {
            "prompt": "SECRET USER TEXT",
            "prompt_hash": "abc",
            "prompt_id": "cleo_system",
            "model": "qwen",
            "latency_ms": 12,
        }
    )
    assert "prompt" not in cleaned
    assert cleaned["prompt_hash"] == "abc"
    assert cleaned["prompt_id"] == "cleo_system"
    assert "SECRET" not in str(cleaned)


def test_langfuse_staging_default_when_keys(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "staging")
    monkeypatch.delenv("LANGFUSE_ENABLED", raising=False)
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk")
    assert langfuse_enabled() is True
    monkeypatch.setenv("LANGFUSE_ENABLED", "false")
    assert langfuse_enabled() is False


def test_cost_ledger_token_times_rate():
    clear_ledger_for_tests()
    cost, rp, rc = compute_cost_usd(
        model="gpt-4o-mini", prompt_tokens=1000, completion_tokens=1000
    )
    assert rp > 0 and rc > 0
    assert cost > 0
    entry = record_llm_cost(
        tenant_id="tenant-test",
        product="cert_studio",
        model="gpt-4o-mini",
        prompt_tokens=2000,
        completion_tokens=500,
    )
    assert entry is not None
    assert entry.cost_usd > 0
    summary = tenant_cost_summary("tenant-test")
    assert summary["calls"] == 1
    assert summary["cost_usd"] > 0
    assert summary["prompt_tokens"] == 2000


def test_otel_trace_propagates_through_meta():
    tid = set_trace_id("trace-sprint5-demo")
    assert current_trace_id() == tid
    meta = inject_trace_into_meta({"job_id": "j1"})
    assert meta["trace_id"] == tid
    with span("api.request", attributes={"route": "/v1/agent/jobs"}):
        with span("celery.run_agent_job", attributes={"job_id": "j1"}):
            with span("ollama.http.chat", attributes={"model": "qwen"}):
                assert current_trace_id() == tid


def test_circuit_breaker_sets_open_metric():
    from agent_core.circuit_breaker import CircuitBreaker

    cb = CircuitBreaker(failure_threshold=2, cooldown_sec=30)
    cb.record_failure(model="test-model")
    cb.record_failure(model="test-model")
    assert cb.is_open is True
