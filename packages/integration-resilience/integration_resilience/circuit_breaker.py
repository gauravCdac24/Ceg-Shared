"""HTTP circuit breaker for downstream service clients (no LLM-specific logic)."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from typing import Any, Protocol

from integration_resilience.errors import CircuitOpenError


class CircuitStore(Protocol):
    def get(self, key: str) -> str | None: ...

    def set(self, key: str, value: str, *, ex: int | None = None) -> None: ...


class RedisCircuitStore:
    """Thin Redis adapter. Client must speak decode_responses=True (str values)."""

    def __init__(self, client: Any) -> None:
        self._client = client

    def get(self, key: str) -> str | None:
        val = self._client.get(key)
        if val is None:
            return None
        return val if isinstance(val, str) else val.decode()

    def set(self, key: str, value: str, *, ex: int | None = None) -> None:
        if ex:
            self._client.setex(key, int(ex), value)
        else:
            self._client.set(key, value)


@dataclass
class HttpCircuitBreaker:
    failure_threshold: int = 5
    cooldown_sec: float = 30.0
    window_sec: float = 60.0
    name: str = ""
    store: CircuitStore | None = field(default=None, repr=False)
    _failures: int = 0
    _window_started_at: float = field(default_factory=time.monotonic)
    _opened_at: float | None = field(default=None, repr=False)

    def _now(self) -> float:
        # Wall clock when shared so API + Celery workers agree on cooldown.
        return time.time() if self.store is not None else time.monotonic()

    def _state_key(self) -> str:
        return f"ceg:circuit:{(self.name or 'upstream').strip() or 'upstream'}"

    def _hydrate(self) -> None:
        if self.store is None:
            return
        try:
            raw = self.store.get(self._state_key())
        except Exception:
            return
        if not raw:
            return
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return
        if not isinstance(data, dict):
            return
        self._failures = int(data.get("failures") or 0)
        self._window_started_at = float(data.get("window_started_at") or self._now())
        opened = data.get("opened_at")
        self._opened_at = float(opened) if opened is not None else None

    def _persist(self) -> None:
        if self.store is None:
            return
        payload = json.dumps(
            {
                "failures": self._failures,
                "window_started_at": self._window_started_at,
                "opened_at": self._opened_at,
            }
        )
        ttl = int(max(self.window_sec, self.cooldown_sec) * 4)
        try:
            self.store.set(self._state_key(), payload, ex=max(ttl, 60))
        except Exception:
            # ponytail: local fields still drive this process if Redis blips
            return

    def _roll_window_if_needed(self) -> None:
        self._hydrate()
        if self._now() - self._window_started_at >= self.window_sec:
            self._failures = 0
            self._window_started_at = self._now()
            self._persist()

    @property
    def is_open(self) -> bool:
        self._hydrate()
        if self._opened_at is None:
            return False
        elapsed = self._now() - self._opened_at
        if elapsed >= self.cooldown_sec:
            self._reset_half_open()
            return False
        return True

    def record_success(self) -> None:
        self._hydrate()
        self._failures = 0
        self._opened_at = None
        self._window_started_at = self._now()
        self._persist()

    def record_failure(self) -> None:
        self._roll_window_if_needed()
        self._failures += 1
        if self._failures >= self.failure_threshold:
            self._opened_at = self._now()
        self._persist()

    def assert_closed(self, service_name: str) -> None:
        if self.is_open:
            raise CircuitOpenError(service_name, cooldown_sec=self.cooldown_sec)

    def _reset_half_open(self) -> None:
        self._failures = 0
        self._opened_at = None
        self._window_started_at = self._now()
        self._persist()


class ServiceCircuitRegistry:
    def __init__(self) -> None:
        self._breakers: dict[str, HttpCircuitBreaker] = {}
        self._store: CircuitStore | None = None

    def use_store(self, store: CircuitStore | None) -> None:
        self._store = store
        for name, breaker in self._breakers.items():
            breaker.store = store
            breaker.name = name

    def get(self, service_name: str) -> HttpCircuitBreaker:
        key = (service_name or "").strip() or "upstream"
        if key not in self._breakers:
            self._breakers[key] = HttpCircuitBreaker(name=key, store=self._store)
        return self._breakers[key]


service_circuit_registry = ServiceCircuitRegistry()
