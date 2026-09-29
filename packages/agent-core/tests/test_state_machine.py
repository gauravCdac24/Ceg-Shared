"""Sprint 2 state machine tests."""

import pytest
from unittest.mock import AsyncMock
from datetime import datetime, timedelta, timezone

from agent_core.agent_job_store import AgentJobStatus


def test_all_statuses_in_enum():
    statuses = {s.value for s in AgentJobStatus}
    required = {
        "queued",
        "planning",
        "executing",
        "verifying",
        "waiting_approval",
        "recovering",
        "done",
        "failed",
    }
    assert required.issubset(statuses)


@pytest.mark.asyncio
async def test_approval_gate_store_and_retrieve():
    from agent_core.approval_gate import ApprovalGate, ApprovalRequest

    mock_redis = AsyncMock()
    gate = ApprovalGate(mock_redis)
    req = ApprovalRequest(
        job_id="test-job",
        step_id="s1",
        step_name="Bulk Issue",
        capability_name="bulk_issue_certificates",
        preview_data={"count": 500, "template": "cyber-2026"},
        requested_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    await gate.request_approval(req)
    mock_redis.setex.assert_called_once()
    call_args = mock_redis.setex.call_args
    assert "approval_request:test-job" in call_args[0][0]


@pytest.mark.asyncio
async def test_approval_decision_submitted():
    from agent_core.approval_gate import ApprovalDecision, ApprovalGate

    mock_redis = AsyncMock()
    gate = ApprovalGate(mock_redis)
    decision = ApprovalDecision(
        job_id="test-job",
        approved=True,
        decided_by="user-123",
        decided_at=datetime.now(timezone.utc),
    )
    await gate.submit_decision(decision)
    mock_redis.setex.assert_called_once()
    call_args = mock_redis.setex.call_args
    assert "approval_decision:test-job" in call_args[0][0]


@pytest.mark.asyncio
async def test_update_status_calls_redis():
    from agent_core.agent_job_store import update_status

    mock_redis = AsyncMock()
    mock_redis.get.return_value = None
    await update_status(mock_redis, "job-xyz", AgentJobStatus.PLANNING)
    mock_redis.setex.assert_called_once()
