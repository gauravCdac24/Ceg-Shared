"""Simple failure counter + cooldown circuit breaker for external LLM calls."""

from __future__ import annotations

import re
import time
from dataclasses import dataclass, field

import structlog

from agent_core.env_resolver import AGENT_OOM_COOLDOWN_SEC, resolve_int_env

log = structlog.get_logger(__name__)

_OOM_PATTERNS = re.compile(
    r"out of memory|cannot allocate|\boom\b",
    re.IGNORECASE,
)


def is_oom_error(exc_or_body: str | BaseException | None) -> bool:
    """Return True when error text indicates an Ollama/host OOM condition."""
    if exc_or_body is None:
        return False
    text = str(exc_or_body)
    if isinstance(exc_or_body, BaseException) and not text:
        text = str(getattr(exc_or_body, "message", "")) or repr(exc_or_body)
    return bool(_OOM_PATTERNS.search(text))


@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    cooldown_sec: float = 60.0
    _failures: int = 0
    _opened_at: float | None = field(default=None, repr=False)
    _active_cooldown_sec: float | None = field(default=None, repr=False)

    def _effective_cooldown(self) -> float:
        if self._active_cooldown_sec is not None:
            return self._active_cooldown_sec
        return self.cooldown_sec

    @property
    def is_open(self) -> bool:
        if self._opened_at is None:
            return False
        elapsed = time.monotonic() - self._opened_at
        if elapsed >= self._effective_cooldown():
            self._reset()
            return False
        return True

    def record_success(self) -> None:
        self._failures = 0
        self._opened_at = None
        self._active_cooldown_sec = None
        try:
            from agent_core.metrics import record_circuit_breaker_state

            record_circuit_breaker_state(model="__default__", open_=False)
        except Exception:
            pass

    def record_failure(
        self,
        *,
        error_body: str | None = None,
        model: str | None = None,
    ) -> None:
        if is_oom_error(error_body or ""):
            self._opened_at = time.monotonic()
            self._active_cooldown_sec = float(
                resolve_int_env(AGENT_OOM_COOLDOWN_SEC, profile_default=30)
            )
            log.warning(
                "llm_oom",
                model=model,
                hint="reduce OLLAMA_NUM_CTX or switch to smaller model",
            )
            try:
                from agent_core.metrics import record_circuit_breaker_state

                record_circuit_breaker_state(model=model or "__default__", open_=True)
            except Exception:
                pass
            return

        self._failures += 1
        if self._failures >= self.failure_threshold:
            self._opened_at = time.monotonic()
            self._active_cooldown_sec = None
            log.warning(
                "circuit_breaker_open",
                failures=self._failures,
                cooldown_sec=self._effective_cooldown(),
                model=model,
            )
            try:
                from agent_core.metrics import record_circuit_breaker_state

                record_circuit_breaker_state(model=model or "__default__", open_=True)
            except Exception:
                pass

    def assert_closed(self) -> None:
        if self.is_open:
            raise RuntimeError(
                f"LLM circuit breaker open; retry after {self._effective_cooldown()}s cooldown"
            )

    def _reset(self) -> None:
        self._failures = 0
        self._opened_at = None
        self._active_cooldown_sec = None
        log.info("circuit_breaker_half_open")
        try:
            from agent_core.metrics import record_circuit_breaker_state

            record_circuit_breaker_state(model="__default__", open_=False)
        except Exception:
            pass


class ModelCircuitRegistry:
    """Per-model circuit breakers for fallback routing."""

    def __init__(self) -> None:
        self._breakers: dict[str, CircuitBreaker] = {}

    def get(self, model: str) -> CircuitBreaker:
        key = (model or "").strip() or "__default__"
        if key not in self._breakers:
            self._breakers[key] = CircuitBreaker()
        return self._breakers[key]


model_circuit_registry = ModelCircuitRegistry()
