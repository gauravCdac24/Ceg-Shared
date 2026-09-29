"""Celery task entrypoint — hosts register this with their broker."""

from __future__ import annotations

from typing import Any, Callable

import structlog

from eligibility_agent.models import EvaluationResult, StructuredProfile
from eligibility_agent.rubric import run_screening_pipeline

logger = structlog.get_logger(__name__)

# Type aliases for host-injected persistence hooks
LoadJobFn = Callable[[str], dict[str, Any]]
SaveProcessingFn = Callable[[str], None]
SaveDoneFn = Callable[[str, StructuredProfile, EvaluationResult], None]
SaveFailedFn = Callable[[str, str], None]
LoadPdfFn = Callable[[str, str], bytes]


def execute_screening_job(
    job_id: str,
    *,
    load_job: LoadJobFn,
    load_pdf_bytes: LoadPdfFn,
    mark_processing: SaveProcessingFn,
    mark_done: SaveDoneFn,
    mark_failed: SaveFailedFn,
) -> dict[str, Any]:
    """Run full screening pipeline for a queued job. Called from Celery worker only."""
    job = load_job(job_id)
    tenant_id = str(job["tenant_id"])
    file_id = str(job["source_file_id"])
    rubric_id = str(job["rubric_id"])
    event_context = job.get("event_context")

    try:
        mark_processing(job_id)
        pdf_bytes = load_pdf_bytes(file_id, tenant_id)
        profile, evaluation = run_screening_pipeline(
            pdf_bytes,
            rubric_id,
            event_context=event_context,
        )
        mark_done(job_id, profile, evaluation)
        return {
            "status": "done",
            "job_id": job_id,
            "final_score": evaluation.final_score,
            "recommended_action": evaluation.recommended_action.value,
        }
    except Exception as exc:  # noqa: BLE001
        reason = str(exc)[:2000]
        logger.error("screening.job_failed", job_id=job_id, error=reason)
        mark_failed(job_id, reason)
        return {"status": "failed", "job_id": job_id, "error": reason}
