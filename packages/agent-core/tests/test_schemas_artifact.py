"""Tests for ArtifactResponse, ArtifactType, and StepEvent schemas."""
import pytest
from datetime import datetime, timezone

from agent_core.schemas import ArtifactResponse, ArtifactType, StepEvent


def test_artifact_type_values():
    assert ArtifactType.QUIZ == "quiz"
    assert ArtifactType.CERTIFICATE == "certificate"
    assert ArtifactType.LANDING_PAGE == "landing_page"


def test_artifact_response_serializes():
    a = ArtifactResponse(
        artifact_id="test-123",
        artifact_type=ArtifactType.CERTIFICATE,
        title="Test Certificate",
        metadata={},
        created_at=datetime.now(timezone.utc),
    )
    d = a.model_dump()
    assert d["artifact_type"] == "certificate"
    assert d["artifact_id"] == "test-123"
    assert "created_at" in d


def test_artifact_response_optional_fields():
    a = ArtifactResponse(
        artifact_id="a1",
        artifact_type=ArtifactType.QUIZ,
        title="My Quiz",
        preview_url="https://example.com/preview",
        download_url="https://example.com/download",
        metadata={"questions": 10},
    )
    assert a.preview_url == "https://example.com/preview"
    assert a.metadata["questions"] == 10


def test_artifact_response_defaults():
    a = ArtifactResponse(
        artifact_id="a2",
        artifact_type=ArtifactType.DOCUMENT,
        title="Doc",
    )
    assert a.preview_url is None
    assert a.download_url is None
    assert a.metadata == {}
    assert a.created_at is not None


def test_step_event_waiting_approval():
    ev = StepEvent(
        step_id="s1",
        step_name="Bulk Issue Certificates",
        status="waiting_approval",
        started_at=datetime.now(timezone.utc),
    )
    assert ev.status == "waiting_approval"
    assert ev.tool_called is None
    assert ev.ended_at is None


def test_step_event_done():
    ev = StepEvent(
        step_id="s2",
        step_name="Generate Quiz",
        tool_called="generate_questions",
        status="done",
        started_at=datetime.now(timezone.utc),
        ended_at=datetime.now(timezone.utc),
        result_summary="Created quiz with 10 questions",
    )
    assert ev.result_summary is not None
    assert ev.tool_called == "generate_questions"


def test_step_event_running():
    ev = StepEvent(
        step_id="s3",
        step_name="Enrich Item",
        tool_called="enrich_item",
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    assert ev.status == "running"
    assert ev.ended_at is None


def test_step_event_failed():
    ev = StepEvent(
        step_id="s4",
        step_name="Push to CeG",
        status="failed",
        started_at=datetime.now(timezone.utc),
        ended_at=datetime.now(timezone.utc),
        result_summary="Connection refused",
    )
    assert ev.status == "failed"
