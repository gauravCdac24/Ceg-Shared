from __future__ import annotations

import pytest
from fastapi import HTTPException

from agent_core.agent_routes_shared import BYOModelConfig, validate_byo_base_url
from agent_core import agent_routes_shared as routes_shared


def test_validate_byo_base_url_blocks_localhost():
    with pytest.raises(HTTPException) as exc:
        validate_byo_base_url("http://localhost:11434")
    assert exc.value.status_code == 400
    assert "url_blocked" in str(exc.value.detail)


@pytest.mark.asyncio
async def test_test_byo_model_blocks_ssrf_target():
    with pytest.raises(HTTPException) as exc:
        await routes_shared.test_byo_model(
            BYOModelConfig(base_url="http://127.0.0.1:11434", model="qwen2.5:7b")
        )
    assert exc.value.status_code == 400
    assert "url_blocked" in str(exc.value.detail)
import uuid

from agent_core.agent_routes_shared import (
    AgentTurnBody,
    AgentCapabilitiesPatchBody,
    build_stream_request,
    merge_agent_capabilities_patch,
)
from agent_core.audit_adapter_factory import audit_row_defaults
from agent_core.audit_logger import AgentAuditEntry
from agent_core.schemas import AgentAttachment, AgentMode


def test_build_stream_request_merges_capability_flags():
    sid = uuid.uuid4()
    body = AgentTurnBody(
        prompt="NEP policy update",
        mode=AgentMode.agent,
        web_search_enabled=True,
        debug_mode=True,
        attachments=[
            AgentAttachment(filename="syllabus.pdf", media_type="application/pdf", base64_data="abc")
        ],
    )
    req = build_stream_request(session_id=sid, body=body)
    assert req.session_id == sid
    assert req.web_search_enabled is True
    assert req.debug_mode is True
    assert req.context.get("web_search_enabled") is True
    assert len(req.attachments) == 1


def test_merge_agent_capabilities_patch():
    updated = merge_agent_capabilities_patch(
        {"mode": "platform", "agent_capabilities": {"web_search_default": False}},
        AgentCapabilitiesPatchBody(web_search_default=True, pdf_parse_allowed=False),
    )
    assert updated["mode"] == "platform"
    assert updated["agent_capabilities"]["web_search_default"] is True
    assert updated["agent_capabilities"]["pdf_parse_allowed"] is False


def test_audit_row_defaults_persists_internet_meta():
    row = audit_row_defaults(
        AgentAuditEntry(
            session_id=str(uuid.uuid4()),
            tenant_id="1",
            product="quizforge",
            user_id="2",
            mode="agent",
            intent="qa",
            prompt_hash="abc",
            search_queries=["NEP 2020"],
            external_urls_fetched=["https://example.gov.in/nep"],
            search_enabled=True,
        )
    )
    internet = row["meta"]["internet"]
    assert internet["search_queries"] == ["NEP 2020"]
    assert internet["external_urls_fetched"] == ["https://example.gov.in/nep"]
    assert internet["search_enabled"] is True
