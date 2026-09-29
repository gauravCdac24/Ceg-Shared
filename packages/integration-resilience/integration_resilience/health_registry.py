"""Integration health registry — tracks downstream availability."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from typing import Any, Protocol


class HealthStore(Protocol):
    def get(self, key: str) -> str | None: ...

    def set(self, key: str, value: str, *, ex: int | None = None) -> None: ...


@dataclass
class InMemoryHealthStore:
    _data: dict[str, str] = field(default_factory=dict)

    def get(self, key: str) -> str | None:
        return self._data.get(key)

    def set(self, key: str, value: str, *, ex: int | None = None) -> None:
        del ex
        self._data[key] = value


class IntegrationHealthRegistry:
    """Open integration target after 3 consecutive probe failures."""

    def __init__(
        self,
        store: HealthStore,
        *,
        key_prefix: str = "integration:health:",
        failure_threshold: int = 3,
        ttl_sec: int = 120,
    ) -> None:
        self._store = store
        self._prefix = key_prefix
        self._failure_threshold = failure_threshold
        self._ttl_sec = ttl_sec

    def _key(self, target: str) -> str:
        return f"{self._prefix}{(target or '').strip().lower()}"

    def _read(self, target: str) -> dict[str, Any]:
        raw = self._store.get(self._key(target))
        if not raw:
            return {"status": "healthy", "consecutive_failures": 0, "last_checked": None}
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"status": "healthy", "consecutive_failures": 0, "last_checked": None}

    def _write(self, target: str, payload: dict[str, Any]) -> None:
        self._store.set(self._key(target), json.dumps(payload), ex=self._ttl_sec)

    def record_success(self, target: str) -> None:
        self._write(
            target,
            {
                "status": "healthy",
                "consecutive_failures": 0,
                "last_checked": time.time(),
            },
        )

    def record_failure(self, target: str) -> None:
        state = self._read(target)
        failures = int(state.get("consecutive_failures") or 0) + 1
        status = "degraded" if failures < self._failure_threshold else "open"
        self._write(
            target,
            {
                "status": status,
                "consecutive_failures": failures,
                "last_checked": time.time(),
            },
        )

    def is_healthy(self, target: str) -> bool:
        state = self._read(target)
        return state.get("status") != "open"

    def get_status(self, target: str) -> dict[str, Any]:
        return self._read(target)
