from __future__ import annotations

import time

import pytest

from integration_resilience import (
    CircuitOpenError,
    HttpCircuitBreaker,
    InMemoryHealthStore,
    IntegrationHealthRegistry,
    compute_next_attempt_at,
    service_circuit_registry,
)


def test_circuit_opens_after_threshold() -> None:
    cb = HttpCircuitBreaker(failure_threshold=3, cooldown_sec=30.0)
    for _ in range(3):
        cb.record_failure()
    assert cb.is_open
    with pytest.raises(CircuitOpenError):
        cb.assert_closed("workshopos")


def test_circuit_resets_on_success() -> None:
    cb = HttpCircuitBreaker(failure_threshold=2, cooldown_sec=30.0)
    cb.record_failure()
    cb.record_success()
    cb.assert_closed("quizforge")


def test_health_registry_opens_after_failures() -> None:
    store = InMemoryHealthStore()
    reg = IntegrationHealthRegistry(store, failure_threshold=3)
    assert reg.is_healthy("workshopos")
    reg.record_failure("workshopos")
    reg.record_failure("workshopos")
    assert reg.is_healthy("workshopos")
    reg.record_failure("workshopos")
    assert not reg.is_healthy("workshopos")
    reg.record_success("workshopos")
    assert reg.is_healthy("workshopos")


def test_compute_next_attempt_backoff_caps_at_300s() -> None:
    first = compute_next_attempt_at(attempts=0)
    late = compute_next_attempt_at(attempts=10)
    assert (late - first).total_seconds() <= 300


def test_service_circuit_registry_singleton_per_name() -> None:
    a = service_circuit_registry.get("workshopos")
    b = service_circuit_registry.get("workshopos")
    assert a is b


def test_circuit_state_shared_via_store() -> None:
    store = InMemoryHealthStore()
    a = HttpCircuitBreaker(failure_threshold=2, cooldown_sec=30.0, name="quizforge", store=store)
    a.record_failure()
    a.record_failure()
    assert a.is_open
    b = HttpCircuitBreaker(failure_threshold=2, cooldown_sec=30.0, name="quizforge", store=store)
    assert b.is_open
    b.record_success()
    c = HttpCircuitBreaker(failure_threshold=2, cooldown_sec=30.0, name="quizforge", store=store)
    assert not c.is_open


def test_circuit_recovers_after_cooldown() -> None:
    store = InMemoryHealthStore()
    cb = HttpCircuitBreaker(failure_threshold=1, cooldown_sec=0.05, name="workshopos", store=store)
    cb.record_failure()
    assert cb.is_open
    time.sleep(0.06)
    assert not cb.is_open
