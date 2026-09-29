"""Queue stub for long agent workflows (Celery-compatible pattern)."""

from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass
from typing import Any

import structlog

from agent_core.agent_job_store import save_job_meta
from agent_core.env_resolver import AGENT_MAX_CONCURRENT_TURNS, resolve_int_env

log = structlog.get_logger(__name__)

AGENT_JOB_KEY_PREFIX = "agent:job:"
AGENT_STREAM_CHANNEL_PREFIX = "agent:stream:"
ACTIVE_TURNS_KEY_PREFIX = "agent:active_turns:"


def assert_sync_stream_allowed() -> None:
    """In queue mode (staging/prod default), agent turns must use POST /v1/agent/jobs."""
    if not is_agent_queue_mode():
        return
    from fastapi import HTTPException

    raise HTTPException(
        status_code=409,
        detail="agent_queue_mode: use POST /v1/agent/jobs and GET /v1/agent/jobs/{job_id}/events",
    )


def is_agent_queue_mode(value: str | bool | None = None) -> bool:
    if isinstance(value, bool):
        return value
    if value is not None and str(value).strip():
        return str(value).strip().lower() in ("1", "true", "yes")
    explicit = os.environ.get("AGENT_QUEUE_MODE", "").strip().lower()
    if explicit in ("0", "false", "no"):
        return False
    if explicit in ("1", "true", "yes"):
        return True
    env = (
        os.environ.get("ENVIRONMENT")
        or os.environ.get("FETCHDESK_ENV")
        or "development"
    ).strip().lower()
    return env in ("production", "prod", "uat", "staging")


@dataclass
class QueuedAgentJob:
    job_id: str | None
    status: str
    poll_url: str | None = None
    celery_task_id: str | None = None
    retry_after: int | None = None


def _active_turns_key(tenant_id: str) -> str:
    return f"{ACTIVE_TURNS_KEY_PREFIX}{tenant_id}"


def _read_active_turns(redis_client: Any | None, tenant_id: str) -> int:
    if redis_client is None:
        return 0
    try:
        raw = redis_client.get(_active_turns_key(tenant_id))
        if raw is None:
            return 0
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8", errors="replace")
        return int(str(raw).strip() or "0")
    except Exception as exc:
        log.warning("agent_active_turns_read_failed", tenant_id=tenant_id, error=str(exc))
        return 0


def enqueue_agent_workflow(
    *,
    tenant_id: str,
    user_id: str,
    session_id: str,
    payload: dict[str, Any],
    queue_name: str = "agent_workflows",
    redis_client: Any | None = None,
    celery_task_id: str | None = None,
) -> QueuedAgentJob:
    """
    Queue metadata for long agent runs. Products dispatch Celery:
      run_agent_job_task.delay(job_id=..., tenant_id=..., payload=...)
    """
    max_concurrent = resolve_int_env(AGENT_MAX_CONCURRENT_TURNS, profile_default=4)
    active = _read_active_turns(redis_client, tenant_id)
    if active >= max_concurrent:
        log.warning(
            "agent_workflow_deferred",
            tenant_id=tenant_id,
            active_turns=active,
            max_concurrent=max_concurrent,
        )
        return QueuedAgentJob(
            job_id=None,
            status="deferred",
            poll_url=None,
            retry_after=10,
        )

    job_id = str(uuid.uuid4())
    poll_url = f"/v1/agent/jobs/{job_id}"
    from agent_core.otel import inject_trace_into_meta, set_trace_id

    meta = inject_trace_into_meta(
        {
            "job_id": job_id,
            "tenant_id": tenant_id,
            "user_id": user_id,
            "session_id": session_id,
            "status": "queued",
            "queue": queue_name,
            "payload": payload,
            "celery_task_id": celery_task_id,
        }
    )
    set_trace_id(str(meta.get("trace_id") or ""))
    if redis_client is not None:
        try:
            save_job_meta(redis_client, job_id, meta)
        except Exception as exc:
            log.warning("agent_job_redis_store_failed", error=str(exc))
    log.info(
        "agent_workflow_queued",
        job_id=job_id,
        tenant_id=tenant_id,
        user_id=user_id,
        session_id=session_id,
        queue=queue_name,
        trace_id=meta.get("trace_id"),
    )
    return QueuedAgentJob(
        job_id=job_id,
        status="queued",
        poll_url=poll_url,
        celery_task_id=celery_task_id,
    )


def get_agent_job_metadata(job_id: str, *, redis_client: Any | None = None) -> dict[str, Any] | None:
    if redis_client is None:
        return None
    try:
        from agent_core.agent_job_store import get_job_meta

        return get_job_meta(redis_client, job_id)
    except Exception:
        return None
