from __future__ import annotations

from types import SimpleNamespace

import pytest

from eligibility_agent.celery_tasks import execute_screening_job


def _base_job() -> dict[str, str]:
    return {
        "tenant_id": "tenant-alpha",
        "source_file_id": "file-1",
        "rubric_id": "workshop_generic",
        "event_context": "Hiring event 2026",
    }


def test_execute_screening_job_uses_tenant_scoped_pdf_and_marks_done(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: dict[str, object] = {}

    profile = SimpleNamespace(model_dump=lambda mode="json": {"basics": {"name": "Jane"}})
    evaluation = SimpleNamespace(
        final_score=81.0,
        recommended_action=SimpleNamespace(value="APPROVE"),
    )

    def fake_pipeline(pdf_bytes: bytes, rubric_id: str, *, event_context: str | None = None):
        calls["pipeline"] = {
            "pdf_bytes": pdf_bytes,
            "rubric_id": rubric_id,
            "event_context": event_context,
        }
        return profile, evaluation

    monkeypatch.setattr("eligibility_agent.celery_tasks.run_screening_pipeline", fake_pipeline)

    def load_pdf_bytes(file_id: str, tenant_id: str) -> bytes:
        calls["load_pdf_bytes"] = {"file_id": file_id, "tenant_id": tenant_id}
        return b"%PDF-1.7 mock"

    def mark_done(job_id: str, got_profile, got_evaluation) -> None:
        calls["mark_done"] = {
            "job_id": job_id,
            "profile": got_profile,
            "evaluation": got_evaluation,
        }

    result = execute_screening_job(
        "job-123",
        load_job=lambda _: _base_job(),
        load_pdf_bytes=load_pdf_bytes,
        mark_processing=lambda job_id: calls.setdefault("mark_processing", job_id),
        mark_done=mark_done,
        mark_failed=lambda *_args: calls.setdefault("mark_failed", True),
    )

    assert result["status"] == "done"
    assert calls["load_pdf_bytes"] == {"file_id": "file-1", "tenant_id": "tenant-alpha"}
    assert calls["pipeline"] == {
        "pdf_bytes": b"%PDF-1.7 mock",
        "rubric_id": "workshop_generic",
        "event_context": "Hiring event 2026",
    }
    assert calls["mark_done"]["job_id"] == "job-123"
    assert calls["mark_done"]["profile"] is profile
    assert calls["mark_done"]["evaluation"] is evaluation
    assert "mark_failed" not in calls


def test_execute_screening_job_marks_failed_on_pipeline_error(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: dict[str, object] = {}

    def boom(*_args, **_kwargs):
        raise RuntimeError("malformed PDF payload")

    monkeypatch.setattr("eligibility_agent.celery_tasks.run_screening_pipeline", boom)

    def mark_failed(job_id: str, reason: str) -> None:
        calls["mark_failed"] = {"job_id": job_id, "reason": reason}

    result = execute_screening_job(
        "job-456",
        load_job=lambda _: _base_job(),
        load_pdf_bytes=lambda *_args: b"%PDF broken",
        mark_processing=lambda _job_id: None,
        mark_done=lambda *_args: calls.setdefault("mark_done", True),
        mark_failed=mark_failed,
    )

    assert result["status"] == "failed"
    assert result["job_id"] == "job-456"
    assert "malformed PDF payload" in result["error"]
    assert calls["mark_failed"]["job_id"] == "job-456"
    assert "malformed PDF payload" in calls["mark_failed"]["reason"]
    assert "mark_done" not in calls
