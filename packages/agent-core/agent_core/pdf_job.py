"""Redis-backed PDF text extraction jobs for large attachments (Celery-compatible)."""

from __future__ import annotations

import base64
import json
import os
import uuid
from typing import Any

import structlog

from agent_core.tools.pdf_extract import extract_pdf_text

log = structlog.get_logger(__name__)

PDF_JOB_PREFIX = "agent:pdf:"
PDF_JOB_TTL_SEC = 3600
SYNC_PDF_MAX_BYTES = int(os.environ.get("AGENT_PDF_SYNC_MAX_BYTES", "262144"))  # 256KB


def pdf_needs_async_job(base64_data: str) -> bool:
    try:
        raw_len = len(base64.b64decode(base64_data, validate=False))
        return raw_len > SYNC_PDF_MAX_BYTES
    except Exception:
        return False


def save_pdf_job_result(
    redis_client: Any,
    job_id: str,
    *,
    text: str,
    error: str | None = None,
    tenant_id: str | None = None,
) -> None:
    payload = {
        "status": "error" if error else "ready",
        "text": text[:12000],
        "error": error,
    }
    if tenant_id:
        payload["tenant_id"] = tenant_id
    redis_client.setex(f"{PDF_JOB_PREFIX}{job_id}", PDF_JOB_TTL_SEC, json.dumps(payload))


def get_pdf_job_result(redis_client: Any, job_id: str) -> dict[str, Any] | None:
    raw = redis_client.get(f"{PDF_JOB_PREFIX}{job_id}")
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def run_pdf_extract_bytes(data: bytes) -> str:
    return extract_pdf_text(data)


def enqueue_pdf_extract_job(
    *,
    redis_client: Any,
    tenant_id: str,
    filename: str,
    base64_data: str,
    celery_dispatch: Any | None = None,
) -> str:
    """Queue PDF extraction. Returns job_id. Celery dispatch is product-specific."""
    job_id = str(uuid.uuid4())
    save_pdf_job_result(redis_client, job_id, text="", error=None, tenant_id=tenant_id)
    redis_client.setex(
        f"{PDF_JOB_PREFIX}{job_id}",
        PDF_JOB_TTL_SEC,
        json.dumps({"status": "queued", "text": "", "filename": filename, "tenant_id": tenant_id}),
    )
    if celery_dispatch is not None:
        celery_dispatch(job_id, base64_data, filename, tenant_id)
        log.info("agent_pdf_job_queued", job_id=job_id, tenant_id=tenant_id, filename=filename)
    else:
        try:
            text = run_pdf_extract_bytes(base64.b64decode(base64_data))
            save_pdf_job_result(redis_client, job_id, text=text, tenant_id=tenant_id)
        except Exception as exc:
            save_pdf_job_result(redis_client, job_id, text="", error=str(exc), tenant_id=tenant_id)
    return job_id


async def await_pdf_job(
    redis_client: Any,
    job_id: str,
    *,
    timeout_sec: float = 20.0,
    poll_interval: float = 0.4,
) -> str:
    """Poll Redis for async PDF job result (used from agent HTTP handler)."""
    import asyncio
    import time

    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        result = get_pdf_job_result(redis_client, job_id)
        if result and result.get("status") == "ready":
            return str(result.get("text") or "")
        if result and result.get("status") == "error":
            return ""
        await asyncio.sleep(poll_interval)
    return ""
