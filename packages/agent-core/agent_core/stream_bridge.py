"""SSE formatting helpers for FastAPI StreamingResponse."""

from __future__ import annotations

import asyncio
import json
import os
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from datetime import datetime, timezone
from typing import Any


def format_sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


def _heartbeat_interval_s() -> float:
    """Portal-style keepalive; env ``CHAT_HEARTBEAT_INTERVAL_S`` (default 12). 0 disables."""
    raw = os.getenv("CHAT_HEARTBEAT_INTERVAL_S", "12")
    try:
        return float(raw)
    except ValueError:
        return 12.0


async def sse_response(
    events: AsyncIterator[dict[str, Any]],
    *,
    heartbeat_interval_s: float | None = None,
    is_disconnected: Callable[[], Awaitable[bool]] | None = None,
    on_close: Callable[[], Awaitable[None]] | None = None,
) -> AsyncIterator[str]:
    """Yield SSE frames; cancel upstream producer on client disconnect / generator exit.

    When ``is_disconnected`` returns True, stop yielding and cancel the producer so
    httpx/Ollama streams unwind (CancelledError → connection close).

    Sprint-8 billing note: cancel-on-disconnect enables partial-credit policy (a) in
    Cert ``_agent_sse`` — full agent charge only after clean ``done``.
    """
    interval = _heartbeat_interval_s() if heartbeat_interval_s is None else float(heartbeat_interval_s)
    if interval <= 0:
        try:
            async for ev in events:
                if is_disconnected is not None and await is_disconnected():
                    break
                yield format_sse(ev)
        finally:
            if on_close is not None:
                try:
                    await on_close()
                except Exception:
                    pass
        return

    agen = events.__aiter__()
    done = object()
    # Keep one event buffered so a slow/disconnected client backpressures the
    # producer instead of accumulating an unbounded response in memory.
    queue: asyncio.Queue[dict[str, Any] | BaseException | object] = asyncio.Queue(maxsize=1)

    async def pump_events() -> None:
        try:
            async for event in agen:
                await queue.put(event)
        except BaseException as exc:
            await queue.put(exc)
        else:
            await queue.put(done)

    producer = asyncio.create_task(pump_events())
    try:
        while True:
            if is_disconnected is not None and await is_disconnected():
                break
            try:
                item = await asyncio.wait_for(queue.get(), timeout=interval)
            except asyncio.TimeoutError:
                if is_disconnected is not None and await is_disconnected():
                    break
                yield format_sse({"event": "heartbeat", "ts": time.time()})
                continue
            if item is done:
                break
            if isinstance(item, BaseException):
                raise item
            yield format_sse(item)
    finally:
        if not producer.done():
            producer.cancel()
            try:
                await producer
            except (asyncio.CancelledError, Exception):
                pass
        aclose = getattr(agen, "aclose", None)
        if callable(aclose):
            try:
                await aclose()
            except Exception:
                pass
        if on_close is not None:
            try:
                await on_close()
            except Exception:
                pass


# ── Sprint 2: structured step-event SSE over Redis pub/sub ───────────────────

async def emit_step_event(redis_client: Any, job_id: str, event: Any) -> None:
    """Publish a structured StepEvent to Redis pub/sub for SSE consumers."""
    from agent_core.schemas import StepEvent  # local import avoids circular

    payload = json.dumps({
        "type": "step_event",
        "payload": event.model_dump(mode="json") if hasattr(event, "model_dump") else event,
    }, default=str)
    await redis_client.publish(f"sse:{job_id}", payload)


async def emit_done(redis_client: Any, job_id: str, artifacts: list) -> None:
    """Publish a done event with artifact list to Redis pub/sub."""
    payload = json.dumps({
        "type": "done",
        "artifacts": artifacts,
    }, default=str)
    await redis_client.publish(f"sse:{job_id}", payload)


async def emit_approval_required(
    redis_client: Any,
    job_id: str,
    step: dict[str, Any],
    approval_payload: dict[str, Any],
) -> None:
    """Publish a waiting_approval step event with approval payload."""
    from agent_core.schemas import StepEvent

    step_event = StepEvent(
        step_id=step.get("step_id", "approval"),
        step_name=step.get("step_name", "Approval Required"),
        status="waiting_approval",
        started_at=datetime.now(timezone.utc),
    )
    payload = json.dumps({
        "type": "step_event",
        "payload": step_event.model_dump(mode="json"),
        "approval_payload": approval_payload,
    }, default=str)
    await redis_client.publish(f"sse:{job_id}", payload)
