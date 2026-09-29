"""Jittered exponential backoff for transient LLM HTTP failures."""

from __future__ import annotations

import asyncio
import random
from collections.abc import Awaitable, Callable
from typing import TypeVar

T = TypeVar("T")

# Retry on these HTTP statuses (rate limit / gateway / overload).
_RETRYABLE_STATUS = frozenset({408, 429, 500, 502, 503, 504})


def is_retryable_status(status_code: int | None) -> bool:
    return status_code is not None and status_code in _RETRYABLE_STATUS


async def with_retries(
    fn: Callable[[], Awaitable[T]],
    *,
    max_attempts: int = 3,
    base_delay_sec: float = 0.35,
    max_delay_sec: float = 4.0,
    retry_on: Callable[[BaseException], bool] | None = None,
) -> T:
    """Run ``fn`` with exponential backoff + full jitter.

    Default retries on httpx transport errors and LLMClientError with
    retryable status codes when ``retry_on`` is omitted.
    """
    last_exc: BaseException | None = None
    attempts = max(1, max_attempts)
    for attempt in range(attempts):
        try:
            return await fn()
        except BaseException as exc:
            last_exc = exc
            if attempt >= attempts - 1:
                break
            if retry_on is not None:
                if not retry_on(exc):
                    raise
            else:
                if not _default_retryable(exc):
                    raise
            delay = min(max_delay_sec, base_delay_sec * (2**attempt))
            delay = delay * (0.5 + random.random())  # full jitter
            await asyncio.sleep(delay)
    assert last_exc is not None
    raise last_exc


def _default_retryable(exc: BaseException) -> bool:
    try:
        import httpx

        if isinstance(exc, (httpx.TransportError, httpx.TimeoutException)):
            return True
    except ImportError:
        pass
    status = getattr(exc, "status_code", None)
    return is_retryable_status(status if isinstance(status, int) else None)
