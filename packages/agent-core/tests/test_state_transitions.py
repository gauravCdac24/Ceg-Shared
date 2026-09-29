"""Tests for Sprint 5 state transition logging."""
import json
import pytest
from unittest.mock import AsyncMock
from agent_core.agent_job_store import AgentJobStatus, get_state_transitions, record_state_transition


@pytest.mark.asyncio
async def test_record_state_transition():
    mock_redis = AsyncMock()
    await record_state_transition(
        mock_redis, "job-1", AgentJobStatus.PLANNING, AgentJobStatus.EXECUTING
    )
    mock_redis.rpush.assert_called_once()
    key, entry_json = mock_redis.rpush.call_args[0]
    assert key == "agent_job:job-1:transitions"
    entry = json.loads(entry_json)
    assert entry["from"] == "planning"
    assert entry["to"] == "executing"
    assert "at" in entry
    assert "meta" in entry


@pytest.mark.asyncio
async def test_record_state_transition_sets_ttl():
    mock_redis = AsyncMock()
    await record_state_transition(
        mock_redis, "job-2", AgentJobStatus.QUEUED, AgentJobStatus.PLANNING
    )
    mock_redis.expire.assert_called_once_with("agent_job:job-2:transitions", 86400)


@pytest.mark.asyncio
async def test_record_state_transition_with_meta():
    mock_redis = AsyncMock()
    await record_state_transition(
        mock_redis, "job-3", AgentJobStatus.EXECUTING, AgentJobStatus.DONE,
        meta={"result_summary": "completed successfully"}
    )
    _, entry_json = mock_redis.rpush.call_args[0]
    entry = json.loads(entry_json)
    assert entry["meta"]["result_summary"] == "completed successfully"


@pytest.mark.asyncio
async def test_get_state_transitions_returns_list():
    mock_redis = AsyncMock()
    mock_redis.lrange = AsyncMock(return_value=[
        json.dumps({"from": "planning", "to": "executing", "at": "2026-06-22T01:00:00Z", "meta": {}})
    ])
    transitions = await get_state_transitions(mock_redis, "job-1")
    assert len(transitions) == 1
    assert transitions[0]["from"] == "planning"
    assert transitions[0]["to"] == "executing"


@pytest.mark.asyncio
async def test_get_state_transitions_empty():
    mock_redis = AsyncMock()
    mock_redis.lrange = AsyncMock(return_value=[])
    transitions = await get_state_transitions(mock_redis, "job-empty")
    assert transitions == []
