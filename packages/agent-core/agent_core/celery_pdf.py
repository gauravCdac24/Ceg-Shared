"""Register a reusable Celery PDF extraction task for agent attachments."""

from __future__ import annotations

import base64
from collections.abc import Callable
from typing import Any

import structlog

from agent_core.pdf_job import run_pdf_extract_bytes, save_pdf_job_result

log = structlog.get_logger(__name__)


def register_pdf_extract_task(
    celery_app: Any,
    *,
    task_name: str,
    get_sync_redis: Callable[[], Any],
) -> Callable[[str, str, str, str], Any]:
    """
    Register ``extract_agent_pdf`` on a product Celery app and return ``dispatch_pdf_extract``.

    Usage in product ``tasks_agent.py``::

        from agent_core.celery_pdf import register_pdf_extract_task
        dispatch_pdf_extract = register_pdf_extract_task(celery_app, task_name="quizforge.extract_agent_pdf", get_sync_redis=_sync_redis)
    """

    @celery_app.task(name=task_name, bind=True, max_retries=0)
    def extract_agent_pdf_task(
        self,
        job_id: str,
        pdf_b64: str,
        filename: str,
        tenant_id: str,
    ) -> dict:
        del self, filename
        r = get_sync_redis()
        try:
            text = run_pdf_extract_bytes(base64.b64decode(pdf_b64))
            save_pdf_job_result(r, job_id, text=text, tenant_id=tenant_id)
            log.info("agent_pdf_extract_done", job_id=job_id)
            return {"job_id": job_id, "status": "ready"}
        except Exception as exc:
            save_pdf_job_result(r, job_id, text="", error=str(exc), tenant_id=tenant_id)
            log.warning("agent_pdf_extract_failed", job_id=job_id, error=str(exc))
            raise

    def dispatch_pdf_extract(job_id: str, pdf_b64: str, filename: str, tenant_id: str):
        return extract_agent_pdf_task.delay(job_id, pdf_b64, filename, tenant_id)

    return dispatch_pdf_extract
