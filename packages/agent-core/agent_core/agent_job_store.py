"""Redis-backed agent job metadata and SSE event buffer (Phase 2)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any

import structlog

log = structlog.get_logger(__name__)

AGENT_JOB_KEY_PREFIX = "agent:job:"
AGENT_JOB_EVENTS_SUFFIX = ":events"
AGENT_JOB_TTL_SEC = 3600


class AgentJobStatus(str, Enum):
    QUEUED = "queued"
    PLANNING = "planning"
    EXECUTING = "executing"
    VERIFYING = "verifying"
    WAITING_APPROVAL = "waiting_approval"
    RECOVERING = "recovering"
    DONE = "done"
    FAILED = "failed"


def _job_key(job_id: str) -> str:
    return f"{AGENT_JOB_KEY_PREFIX}{job_id}"


def _events_key(job_id: str) -> str:
    return f"{AGENT_JOB_KEY_PREFIX}{job_id}{AGENT_JOB_EVENTS_SUFFIX}"


def save_job_meta(redis_client: Any, job_id: str, meta: dict[str, Any]) -> None:
    payload = dict(meta)
    payload["job_id"] = job_id
    redis_client.setex(_job_key(job_id), AGENT_JOB_TTL_SEC, json.dumps(payload))


def update_job_status(
    redis_client: Any,
    job_id: str,
    status: str,
    *,
    error: str | None = None,
    result: dict[str, Any] | None = None,
) -> None:
    raw = redis_client.get(_job_key(job_id))
    meta: dict[str, Any] = {}
    if raw:
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        try:
            loaded = json.loads(raw)
            if isinstance(loaded, dict):
                meta = loaded
        except json.JSONDecodeError:
            pass
    meta["status"] = status
    if error:
        meta["error"] = error[:500]
    if result is not None:
        meta["result"] = result
    save_job_meta(redis_client, job_id, meta)


def append_job_event(redis_client: Any, job_id: str, event: dict[str, Any]) -> None:
    key = _events_key(job_id)
    redis_client.rpush(key, json.dumps(event))
    redis_client.expire(key, AGENT_JOB_TTL_SEC)


def get_job_meta(redis_client: Any, job_id: str) -> dict[str, Any] | None:
    raw = redis_client.get(_job_key(job_id))
    if not raw:
        return None
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def get_job_events(
    redis_client: Any,
    job_id: str,
    *,
    start: int = 0,
    limit: int = 200,
) -> list[dict[str, Any]]:
    key = _events_key(job_id)
    raw_items = redis_client.lrange(key, start, start + limit - 1)
    events: list[dict[str, Any]] = []
    for raw in raw_items or []:
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        try:
            item = json.loads(raw)
            if isinstance(item, dict):
                events.append(item)
        except json.JSONDecodeError:
            continue
    return events


async def aget_job_meta(redis_client: Any, job_id: str) -> dict[str, Any] | None:
    raw = await redis_client.get(_job_key(job_id))
    if not raw:
        return None
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


async def update_status(
    redis_client: Any,
    job_id: str,
    status: AgentJobStatus,
    meta: dict[str, Any] | None = None,
) -> None:
    """Write job status to Redis and log with structlog (Sprint 2 state machine)."""
    raw = await redis_client.get(_job_key(job_id))
    existing: dict[str, Any] = {}
    if raw:
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        try:
            loaded = json.loads(raw)
            if isinstance(loaded, dict):
                existing = loaded
        except json.JSONDecodeError:
            pass
    prev_status_str: str | None = existing.get("status")
    existing["status"] = status.value
    if meta:
        existing.update(meta)
    await redis_client.setex(_job_key(job_id), AGENT_JOB_TTL_SEC, json.dumps(existing))
    log.info(
        "agent_job_status_updated",
        job_id=job_id,
        status=status.value,
    )
    # Record state transition for audit trail (Sprint 5)
    try:
        from_status = AgentJobStatus(prev_status_str) if prev_status_str else AgentJobStatus.QUEUED
        await record_state_transition(redis_client, job_id, from_status, status)
    except (ValueError, Exception):
        pass


async def record_state_transition(
    redis_client: Any,
    job_id: str,
    from_status: AgentJobStatus,
    to_status: AgentJobStatus,
    meta: dict | None = None,
) -> None:
    """Append a timestamped state transition log entry in Redis."""
    key = f"agent_job:{job_id}:transitions"
    entry = {
        "from": from_status.value,
        "to": to_status.value,
        "at": datetime.now(timezone.utc).isoformat(),
        "meta": meta or {},
    }
    await redis_client.rpush(key, json.dumps(entry))
    await redis_client.expire(key, 86400)  # 24h TTL


async def get_state_transitions(redis_client: Any, job_id: str) -> list[dict]:
    """Read full state transition log for a job."""
    key = f"agent_job:{job_id}:transitions"
    raw_list = await redis_client.lrange(key, 0, -1)
    return [json.loads(r) for r in (raw_list or [])]


async def aget_job_events(
    redis_client: Any,
    job_id: str,
    *,
    start: int = 0,
    limit: int = 200,
) -> list[dict[str, Any]]:
    key = _events_key(job_id)
    raw_items = await redis_client.lrange(key, start, start + limit - 1)
    events: list[dict[str, Any]] = []
    for raw in raw_items or []:
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        try:
            item = json.loads(raw)
            if isinstance(item, dict):
                events.append(item)
        except json.JSONDecodeError:
            continue
    return events
