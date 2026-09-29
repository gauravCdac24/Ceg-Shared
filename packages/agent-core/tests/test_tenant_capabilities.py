"""Tests for tenant agent settings and citation eval."""

from __future__ import annotations

from agent_core.eval.citation_eval import score_citation_compliance
from agent_core.capability_flags import CapabilityFlags
from agent_core.tenant_agent_settings import parse_tenant_agent_capabilities
from agent_core.tools.register import resolve_session_capabilities


def test_tenant_web_search_default_when_request_unset():
    caps = resolve_session_capabilities(
        request_context={
            "tenant_agent_capabilities": {
                "web_search_allowed": True,
                "web_search_default": True,
            }
        },
        web_search_enabled=None,
    )
    assert caps.web_search_enabled is True


def test_tenant_blocks_web_search():
    caps = resolve_session_capabilities(
        request_context={
            "tenant_agent_capabilities": {"web_search_allowed": False, "web_search_default": True}
        },
        web_search_enabled=True,
    )
    assert caps.web_search_enabled is False


def test_pdf_parse_auto_enabled_when_attachment_present():
    caps = resolve_session_capabilities(
        request_context={"tenant_agent_capabilities": {"pdf_parse_allowed": True}},
        attachments=[{"media_type": "application/pdf", "filename": "syllabus.pdf"}],
        flags=CapabilityFlags(
            web_search=True,
            url_fetch=True,
            image_vision=True,
            pdf_parse=True,
            subagent_spawn=True,
            plan_mode=True,
            debug_mode=True,
            web_search_provider="ddg",
            web_search_max_results=5,
            blocked_domains=(),
        ),
    )
    assert caps.pdf_parse_enabled is True


def test_parse_tenant_agent_capabilities_nested():
    raw = {"agent_capabilities": {"web_search_default": True, "web_search_allowed": True}}
    caps = parse_tenant_agent_capabilities(raw)
    assert caps.web_search_default is True


def test_citation_eval_passes_with_url_and_date():
    result = score_citation_compliance(
        "Source: NEP 2020 (https://example.gov.in/nep) accessed 2026-06-14, policy changed.",
        used_web_search=True,
    )
    assert result["passed"] is True
    assert result["url_count"] >= 1


def test_citation_eval_fails_without_url_when_search_used():
    result = score_citation_compliance(
        "The policy was updated recently according to official sources.",
        used_web_search=True,
    )
    assert result["passed"] is False
    assert "web_search_used_but_no_url_cited" in result["reasons"]
