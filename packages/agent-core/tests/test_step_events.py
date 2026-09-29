"""Sprint 2 SSE step event tests."""

import json
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock

from agent_core.schemas import StepEvent
from agent_core.stream_bridge import emit_step_event


@pytest.mark.asyncio
async def test_emit_step_event_publishes_to_redis():
    mock_redis = AsyncMock()
    event = StepEvent(
        step_id="s1",
        step_name="Generate Quiz",
        tool_called="create_quiz",
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    await emit_step_event(mock_redis, "job-abc", event)
    mock_redis.publish.assert_called_once()
    channel, payload = mock_redis.publish.call_args[0]
    assert channel == "sse:job-abc"
    data = json.loads(payload)
    assert data["type"] == "step_event"
    assert data["payload"]["step_id"] == "s1"
    assert data["payload"]["status"] == "running"


@pytest.mark.asyncio
async def test_emit_step_event_done_status():
    mock_redis = AsyncMock()
    event = StepEvent(
        step_id="s2",
        step_name="Add Questions",
        tool_called="add_questions_to_pool",
        status="done",
        started_at=datetime.now(timezone.utc),
        result_summary="Imported 5 questions",
    )
    await emit_step_event(mock_redis, "job-abc", event)
    channel, payload = mock_redis.publish.call_args[0]
    data = json.loads(payload)
    assert data["payload"]["status"] == "done"
    assert data["payload"]["result_summary"] == "Imported 5 questions"


@pytest.mark.asyncio
async def test_emit_approval_required():
    from agent_core.stream_bridge import emit_approval_required

    mock_redis = AsyncMock()
    step = {"step_id": "s3", "step_name": "Bulk Issue"}
    approval_payload = {"count": 500}
    await emit_approval_required(mock_redis, "job-abc", step, approval_payload)
    mock_redis.publish.assert_called_once()
    channel, payload = mock_redis.publish.call_args[0]
    data = json.loads(payload)
    assert data["type"] == "step_event"
    assert data["payload"]["status"] == "waiting_approval"
    assert data["approval_payload"] == approval_payload
