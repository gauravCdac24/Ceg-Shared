"""Shared /agent/jobs routes for Celery-queued agent turns (B-H07 rollout)."""

from __future__ import annotations

import json
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from agent_core.agent_job_store import aget_job_events, aget_job_meta, save_job_meta
from agent_core.schemas import AgentMode
from agent_core.task_queue import enqueue_agent_workflow, is_agent_queue_mode


class AgentJobQueueBody(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    mode: AgentMode = AgentMode.agent
    session_id: uuid.UUID | None = None
    context: dict[str, Any] = Field(default_factory=dict)
    attachments: list[Any] = Field(default_factory=list)
    web_search_enabled: bool | None = None
    url_fetch_enabled: bool | None = None
    debug_mode: bool = False


@dataclass
class AgentJobRouteDeps:
    """Product-specific wiring for agent job poll routes."""

    auth_dependency: Callable[..., Any]
    parse_auth: Callable[[Any], tuple[str, str]]
    get_async_redis: Callable[..., Awaitable[Any]]
    get_sync_redis: Callable[[], Any]
    assert_agent_enabled: Callable[[], None]
    dispatch_celery: Callable[[str, str, str, str, str], Any]
    before_auth: Callable[[Any], None] | None = None


def register_agent_job_routes(
    router: APIRouter,
    deps: AgentJobRouteDeps,
    *,
    apply_rate_limit: Callable[[Callable], Callable] | None = None,
) -> None:
    """Mount POST /jobs, GET /jobs/{id}, GET /jobs/{id}/events on an existing agent router."""

    def _wrap_rate_limit(handler: Callable) -> Callable:
        if apply_rate_limit is not None:
            return apply_rate_limit(handler)
        return handler

    @_wrap_rate_limit
    @router.post("/jobs")
    async def queue_agent_job(
        request: Request,
        body: AgentJobQueueBody,
        auth: Any = Depends(deps.auth_dependency),
    ) -> dict[str, Any]:
        if deps.before_auth is not None:
            deps.before_auth(auth)
        deps.assert_agent_enabled()
        if not is_agent_queue_mode():
            raise HTTPException(
                status_code=400,
                detail="Agent queue mode disabled; use POST /v1/agent/stream",
            )
        tenant_id, user_id = deps.parse_auth(auth)
        session_id = body.session_id or uuid.uuid4()
        payload = {
            "prompt": body.prompt,
            "mode": body.mode.value,
            "context": body.context,
            "attachments": [a.model_dump() if hasattr(a, "model_dump") else a for a in body.attachments],
            "web_search_enabled": body.web_search_enabled,
            "url_fetch_enabled": body.url_fetch_enabled,
            "debug_mode": body.debug_mode,
        }
        sync_redis = deps.get_sync_redis()
        queued = enqueue_agent_workflow(
            tenant_id=tenant_id,
            user_id=user_id,
            session_id=str(session_id),
            payload=payload,
            redis_client=sync_redis,
        )
        if queued.status == "deferred":
            retry_after = str(queued.retry_after or 10)
            raise HTTPException(
                status_code=429,
                detail="Server busy; active agent turns at capacity. Retry shortly.",
                headers={"Retry-After": retry_after},
            )
        task = deps.dispatch_celery(
            queued.job_id,
            tenant_id,
            user_id,
            str(session_id),
            json.dumps(payload),
        )
        meta = await aget_job_meta(await deps.get_async_redis(), queued.job_id) or {}
        meta["celery_task_id"] = getattr(task, "id", None)
        save_job_meta(sync_redis, queued.job_id, meta)
        return {
            "status": "queued",
            "job_id": queued.job_id,
            "session_id": str(session_id),
            "poll_url": queued.poll_url,
            "events_url": f"/v1/agent/jobs/{queued.job_id}/events",
        }

    @router.get("/jobs/{job_id}")
    async def get_agent_job(
        job_id: str,
        auth: Any = Depends(deps.auth_dependency),
    ) -> dict[str, Any]:
        if deps.before_auth is not None:
            deps.before_auth(auth)
        tenant_id, _user_id = deps.parse_auth(auth)
        redis = await deps.get_async_redis()
        meta = await aget_job_meta(redis, job_id)
        if not meta:
            raise HTTPException(404, "Job not found")
        if str(meta.get("tenant_id")) != str(tenant_id):
            raise HTTPException(403, "Job not owned by tenant")
        return {
            "job_id": job_id,
            "status": meta.get("status", "unknown"),
            "session_id": meta.get("session_id"),
            "error": meta.get("error"),
        }

    @router.get("/jobs/{job_id}/events")
    async def get_agent_job_events(
        job_id: str,
        offset: int = 0,
        auth: Any = Depends(deps.auth_dependency),
    ) -> dict[str, Any]:
        if deps.before_auth is not None:
            deps.before_auth(auth)
        tenant_id, _user_id = deps.parse_auth(auth)
        redis = await deps.get_async_redis()
        meta = await aget_job_meta(redis, job_id)
        if not meta:
            raise HTTPException(404, "Job not found")
        if str(meta.get("tenant_id")) != str(tenant_id):
            raise HTTPException(403, "Job not owned by tenant")
        events = await aget_job_events(redis, job_id, start=max(0, offset))
        return {"job_id": job_id, "status": meta.get("status"), "events": events}
