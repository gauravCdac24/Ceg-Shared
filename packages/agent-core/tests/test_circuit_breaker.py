from __future__ import annotations

import pytest

from agent_core.circuit_breaker import CircuitBreaker, is_oom_error


def test_is_oom_error_detects_common_messages() -> None:
    assert is_oom_error("CUDA out of memory")
    assert is_oom_error("cannot allocate tensor")
    assert not is_oom_error("connection reset")


def test_circuit_opens_after_threshold():
    cb = CircuitBreaker(failure_threshold=3, cooldown_sec=60.0)
    for _ in range(3):
        cb.record_failure()
    assert cb.is_open
    with pytest.raises(RuntimeError, match="circuit breaker open"):
        cb.assert_closed()


def test_circuit_resets_on_success():
    cb = CircuitBreaker(failure_threshold=2, cooldown_sec=60.0)
    cb.record_failure()
    cb.record_success()
    cb.assert_closed()


def test_oom_error_triggers_longer_cooldown(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENT_OOM_COOLDOWN_SEC", "45")
    cb = CircuitBreaker(failure_threshold=5, cooldown_sec=10.0)
    cb.record_failure(error_body="HTTP 500: out of memory loading model", model="qwen2.5:7b")
    assert cb.is_open
    assert cb._active_cooldown_sec == 45.0
