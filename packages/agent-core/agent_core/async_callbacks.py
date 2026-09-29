"""Non-blocking LLM lifecycle callbacks.

Handlers run off the inference path: failures never crash generation.
Optional prometheus / structlog sinks only — no network I/O on the hot path
unless a handler schedules it asynchronously.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import time
from dataclasses import dataclass, field
from typing import Any, Protocol

import structlog

log = structlog.get_logger(__name__)

_executor = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="llm-cb")


@dataclass
class LLMCallEvent:
    """Sanitized lifecycle event — never stores raw prompts or completions."""

    phase: str  # start | first_token | end | error | tool | retry
    product: str = ""
    model: str = ""
    session_id: str = ""
    tenant_id: str = ""
    latency_ms: float | None = None
    ttft_ms: float | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    cache_hit: bool | None = None
    retries: int = 0
    error: str | None = None
    tool_name: str | None = None
    prompt_id: str | None = None
    prompt_version: str | None = None
    meta: dict[str, Any] = field(default_factory=dict)


class LLMCallbackHandler(Protocol):
    def on_event(self, event: LLMCallEvent) -> None: ...


class StructlogCallbackHandler:
    """Always-on structured log sink (no PII)."""

    def on_event(self, event: LLMCallEvent) -> None:
        log.info(
            "llm_callback",
            phase=event.phase,
            product=event.product,
            model=event.model,
            session_id=event.session_id,
            tenant_id=event.tenant_id,
            latency_ms=event.latency_ms,
            ttft_ms=event.ttft_ms,
            prompt_tokens=event.prompt_tokens,
            completion_tokens=event.completion_tokens,
            cache_hit=event.cache_hit,
            retries=event.retries,
            error=event.error,
            tool_name=event.tool_name,
            prompt_id=event.prompt_id,
            prompt_version=event.prompt_version,
        )


class MetricsCallbackHandler:
    """Best-effort Prometheus sink — no-op when prometheus_client missing."""

    def on_event(self, event: LLMCallEvent) -> None:
        try:
            from agent_core.metrics import record_llm_event

            record_llm_event(event)
        except Exception:
            pass


class AsyncCallbackDispatcher:
    """Fan-out to handlers without blocking the caller.

    - Prefer asyncio.create_task when a loop is running.
    - Else submit to a small thread pool.
    - Each handler is isolated; one failure does not stop others.
    """

    def __init__(self, handlers: list[LLMCallbackHandler] | None = None) -> None:
        self._handlers: list[LLMCallbackHandler] = list(
            handlers
            or [
                StructlogCallbackHandler(),
                MetricsCallbackHandler(),
            ]
        )

    def add_handler(self, handler: LLMCallbackHandler) -> None:
        self._handlers.append(handler)

    def emit(self, event: LLMCallEvent) -> None:
        for handler in self._handlers:
            self._schedule(handler, event)

    def _schedule(self, handler: LLMCallbackHandler, event: LLMCallEvent) -> None:
        def _run() -> None:
            try:
                handler.on_event(event)
            except Exception as exc:
                log.warning("llm_callback_failed", error=str(exc), phase=event.phase)

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            _executor.submit(_run)
            return
        loop.run_in_executor(_executor, _run)


_default_dispatcher: AsyncCallbackDispatcher | None = None


def get_callback_dispatcher() -> AsyncCallbackDispatcher:
    global _default_dispatcher
    if _default_dispatcher is None:
        _default_dispatcher = AsyncCallbackDispatcher()
    return _default_dispatcher


def emit_llm_event(**kwargs: Any) -> None:
    """Fire-and-forget helper for runners / routers."""
    get_callback_dispatcher().emit(LLMCallEvent(**kwargs))


class TurnCallbackScope:
    """Context helper to stamp start → first_token → end around a turn."""

    def __init__(
        self,
        *,
        product: str = "",
        model: str = "",
        session_id: str = "",
        tenant_id: str = "",
        prompt_id: str | None = None,
        prompt_version: str | None = None,
    ) -> None:
        self.product = product
        self.model = model
        self.session_id = session_id
        self.tenant_id = tenant_id
        self.prompt_id = prompt_id
        self.prompt_version = prompt_version
        self._t0 = time.perf_counter()
        self.ttft_ms: float | None = None
        self.retries = 0

    def start(self) -> None:
        emit_llm_event(
            phase="start",
            product=self.product,
            model=self.model,
            session_id=self.session_id,
            tenant_id=self.tenant_id,
            prompt_id=self.prompt_id,
            prompt_version=self.prompt_version,
        )

    def first_token(self) -> None:
        if self.ttft_ms is None:
            self.ttft_ms = round((time.perf_counter() - self._t0) * 1000, 1)
            emit_llm_event(
                phase="first_token",
                product=self.product,
                model=self.model,
                session_id=self.session_id,
                tenant_id=self.tenant_id,
                ttft_ms=self.ttft_ms,
                prompt_id=self.prompt_id,
                prompt_version=self.prompt_version,
            )

    def end(
        self,
        *,
        prompt_tokens: int | None = None,
        completion_tokens: int | None = None,
        error: str | None = None,
        cache_hit: bool | None = None,
    ) -> None:
        emit_llm_event(
            phase="error" if error else "end",
            product=self.product,
            model=self.model,
            session_id=self.session_id,
            tenant_id=self.tenant_id,
            latency_ms=round((time.perf_counter() - self._t0) * 1000, 1),
            ttft_ms=self.ttft_ms,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cache_hit=cache_hit,
            retries=self.retries,
            error=error,
            prompt_id=self.prompt_id,
            prompt_version=self.prompt_version,
        )
