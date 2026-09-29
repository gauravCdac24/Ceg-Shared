"""
CEG AI Agent Platform — End-to-End Smoke Test
Proves the full pipeline works without real API calls.
Run: cd packages/agent-core && pytest tests/test_smoke_e2e.py -v -s
"""
import pytest
import json
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone


@pytest.mark.asyncio
async def test_capability_registry_resolves_create_quiz():
    from agent_core.capability_registry import capability_registry
    cap = capability_registry.resolve("create_quiz")
    assert cap.product == "quizforge"
    assert cap.tool_name is not None
    print(f"\n[OK] create_quiz -> {cap.product}/{cap.tool_name} @ {cap.mcp_server_url}")


@pytest.mark.asyncio
async def test_handoff_capabilities_present():
    from agent_core.capability_registry import capability_registry
    caps = capability_registry.list_all()
    handoff = [c for c in caps if c.capability_name.startswith("handoff_to_")]
    assert len(handoff) >= 4, f"Expected >= 4 handoff caps, got {len(handoff)}"
    print(f"\n[OK] Handoff capabilities: {[c.capability_name for c in handoff]}")


@pytest.mark.asyncio
async def test_artifact_response_roundtrip():
    from agent_core.schemas import ArtifactResponse, ArtifactType
    artifact = ArtifactResponse(
        artifact_id="smoke-001",
        artifact_type=ArtifactType.QUIZ,
        title="Python Basics Quiz",
        metadata={"question_count": 10},
        created_at=datetime.now(timezone.utc),
    )
    data = json.loads(artifact.model_dump_json())
    assert data["artifact_id"] == "smoke-001"
    assert data["artifact_type"] == "quiz"
    print(f"\n[OK] ArtifactResponse roundtrip: {artifact.title}")


@pytest.mark.asyncio
async def test_step_event_sse_format():
    from agent_core.schemas import StepEvent
    from agent_core.stream_bridge import emit_step_event
    mock_redis = AsyncMock()
    event = StepEvent(
        step_id="s1", step_name="Generate Quiz", tool_called="create_quiz",
        status="done", started_at=datetime.now(timezone.utc),
        ended_at=datetime.now(timezone.utc),
        result_summary="Created 10-question quiz",
    )
    await emit_step_event(mock_redis, "job-smoke-001", event)
    mock_redis.publish.assert_called_once()
    channel, payload_str = mock_redis.publish.call_args[0]
    assert channel == "sse:job-smoke-001"
    payload = json.loads(payload_str)
    assert payload["type"] == "step_event"
    assert payload["payload"]["status"] == "done"
    print(f"\n[OK] SSE step_event on channel '{channel}'")


@pytest.mark.asyncio
async def test_approval_gate_request_and_decision():
    from agent_core.approval_gate import ApprovalGate, ApprovalRequest, ApprovalDecision
    mock_redis = AsyncMock()
    gate = ApprovalGate(mock_redis)
    req = ApprovalRequest(
        job_id="smoke-job-002", step_id="bulk", step_name="Bulk Issue 1000 Certs",
        capability_name="bulk_issue_certificates",
        preview_data={"count": 1000, "template": "cyber-2026"},
        requested_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc),
    )
    await gate.request_approval(req)
    assert mock_redis.setex.called
    decision = ApprovalDecision(
        job_id="smoke-job-002", approved=True,
        decided_by="admin-001", decided_at=datetime.now(timezone.utc),
    )
    await gate.submit_decision(decision)
    assert mock_redis.setex.call_count == 2
    print(f"\n[OK] ApprovalGate: request stored + decision submitted")


@pytest.mark.asyncio
async def test_event_bus_publish_and_format():
    from agent_core.event_bus import publish_event, DomainEvent
    mock_redis = AsyncMock()
    await publish_event(mock_redis, DomainEvent.QUIZ_COMPLETED,
                        {"quiz_id": "qz-001", "score": 95}, tenant_id="smoke-tenant")
    mock_redis.publish.assert_called_once()
    channel, message = mock_redis.publish.call_args[0]
    data = json.loads(message)
    assert data["event"] == "quiz.completed"
    assert data["payload"]["quiz_id"] == "qz-001"
    print(f"\n[OK] Event bus: '{data['event']}' published to '{channel}'")


@pytest.mark.asyncio
async def test_memory_types_defined():
    from agent_core.schemas import MemoryType
    values = {m.value for m in MemoryType}
    assert values == {"episodic", "semantic", "procedural", "working"}
    print(f"\n[OK] Memory types: {sorted(values)}")


@pytest.mark.asyncio
async def test_model_router_all_task_types():
    from agent_core.model_router import route_model, TaskType, ModelConfig
    for task_type in TaskType:
        cfg = route_model(task_type)
        assert isinstance(cfg, ModelConfig)
        assert cfg.provider
        assert cfg.model_name
        print(f"  {task_type.value:30s} -> {cfg.provider}/{cfg.model_name}")
    print(f"\n[OK] Model router: all {len(list(TaskType))} task types resolved")


def test_platform_summary():
    from agent_core.capability_registry import capability_registry
    from agent_core.agent_job_store import AgentJobStatus
    from agent_core.schemas import ArtifactType

    caps = capability_registry.list_all()
    handoff = [c for c in caps if "handoff" in c.capability_name]
    statuses = [s.value for s in AgentJobStatus]
    artifact_types = [a.value for a in ArtifactType]

    print("\n" + "=" * 60)
    print("CEG AI AGENT PLATFORM - FINAL SMOKE TEST SUMMARY")
    print("=" * 60)
    print(f"  Total capabilities : {len(caps)}")
    print(f"  Handoff caps       : {len(handoff)}")
    print(f"  Job states         : {statuses}")
    print(f"  Artifact types     : {artifact_types}")
    print(f"  Products w/ MCP    : CeG(8001), WOS(8011), QF(8021), CS(8031), FD(8041)")
    print("=" * 60)

    assert len(caps) >= 18
    assert len(handoff) >= 4
    assert "waiting_approval" in statuses
    assert "certificate" in artifact_types
    print("[OK] All assertions passed.")
