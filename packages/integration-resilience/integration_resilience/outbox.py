"""Outbox status helpers (persistence lives in each product DB)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from enum import StrEnum


class OutboxStatus(StrEnum):
    PENDING = "pending"
    IN_FLIGHT = "in_flight"
    SYNCED = "synced"
    DEGRADED = "degraded"
    DEAD_LETTER = "dead_letter"


def default_max_attempts() -> int:
    return 8


def compute_next_attempt_at(*, attempts: int, now: datetime | None = None) -> datetime:
    """Exponential backoff: min(2^attempts * 5s, 300s)."""
    base = now or datetime.now(timezone.utc)
    delay_sec = min((2 ** max(attempts, 0)) * 5, 300)
    return base + timedelta(seconds=delay_sec)
