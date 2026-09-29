"""SSE bridge: poll Redis agent job events while Celery runs the turn."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any


async def iter_agent_job_sse(
    *,
    redis: Any,
    job_id: str,
    poll_interval_s: float = 0.35,
    idle_timeout_s: float = 600.0,
    trace_id: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Yield SSE-shaped dicts from ``agent:job:{id}:events`` until terminal status.

    Terminal: meta.status in ready|error|failed|done.
    Propagates OTel/context trace_id from job meta when present (Sprint-5 #52).
    """
    from agent_core.agent_job_store import aget_job_events, aget_job_meta
    from agent_core.otel import adopt_trace_from_meta, current_trace_id, set_trace_id, span

    offset = 0
    idle = 0.0
    if trace_id:
        set_trace_id(trace_id)

    with span("agent.job_sse_bridge", attributes={"job_id": job_id}):
        yield {
            "event": "status",
            "text": "Queued…",
            "stage": "queued",
            "job_id": job_id,
            "trace_id": current_trace_id(),
        }

        while idle < idle_timeout_s:
            meta = await aget_job_meta(redis, job_id) or {}
            adopt_trace_from_meta(meta)
            status = str(meta.get("status") or "unknown")
            events = await aget_job_events(redis, job_id, start=offset)
            if events:
                idle = 0.0
                for ev in events:
                    offset += 1
                    if isinstance(ev, dict):
                        if "trace_id" not in ev:
                            ev = {**ev, "trace_id": current_trace_id()}
                        yield ev
                    else:
                        yield {
                            "event": "message",
                            "text": str(ev),
                            "trace_id": current_trace_id(),
                        }
            else:
                idle += poll_interval_s

            if status in ("ready", "done"):
                yield {
                    "event": "done",
                    "job_id": job_id,
                    "status": status,
                    "trace_id": current_trace_id(),
                }
                return
            if status in ("error", "failed"):
                err = str(meta.get("error") or "Agent job failed")
                yield {"event": "error", "text": err[:500], "trace_id": current_trace_id()}
                yield {
                    "event": "done",
                    "job_id": job_id,
                    "status": status,
                    "trace_id": current_trace_id(),
                }
                return

            await asyncio.sleep(poll_interval_s)

        yield {
            "event": "error",
            "text": "Timed out waiting for queued agent job",
            "trace_id": current_trace_id(),
        }
        yield {
            "event": "done",
            "job_id": job_id,
            "status": "timeout",
            "trace_id": current_trace_id(),
        }
