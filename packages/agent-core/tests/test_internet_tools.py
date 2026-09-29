"""Tests for internet agent tools and session capability filtering."""

from __future__ import annotations

import json
import os

import pytest
import respx
from httpx import Response

from agent_core.schemas import SessionCapabilities, ToolSpec
from agent_core.tool_registry import ToolRegistry
from agent_core.tools.fetch_url import fetch_url
from agent_core.tools.register import (
    filter_tool_specs_for_session,
    register_internet_tools,
    resolve_session_capabilities,
)
from agent_core.tools.url_safety import strip_html_to_text, validate_outbound_url
from agent_core.tools.web_search import web_search


def test_validate_outbound_url_blocks_localhost():
    ok, reason = validate_outbound_url("http://localhost/admin")
    assert not ok
    assert reason == "blocked_host"


def test_strip_html_to_text():
    html = "<html><body><h1>Title</h1><p>Hello <b>world</b></p></body></html>"
    text = strip_html_to_text(html)
    assert "Title" in text
    assert "Hello" in text


def test_resolve_session_capabilities_defaults_off():
    caps = resolve_session_capabilities(request_context={})
    assert caps.web_search_enabled is False
    assert caps.url_fetch_enabled is False


def test_resolve_session_capabilities_honors_request_flag(monkeypatch):
    monkeypatch.setenv("AGENT_WEB_SEARCH_ENABLED", "true")
    caps = resolve_session_capabilities(
        request_context={},
        web_search_enabled=True,
    )
    assert caps.web_search_enabled is True
    assert caps.url_fetch_enabled is True


def test_filter_tool_specs_for_session():
    specs = [
        ToolSpec(name="web_search", description="s"),
        ToolSpec(name="fetch_url", description="f"),
        ToolSpec(name="local_tool", description="l"),
    ]
    filtered = filter_tool_specs_for_session(
        specs,
        SessionCapabilities(web_search_enabled=False),
    )
    assert [s.name for s in filtered] == ["local_tool"]


@pytest.mark.asyncio
async def test_web_search_disabled_when_session_off():
    out = await web_search(query="NEP 2020 update", _context={"web_search_enabled": False})
    data = json.loads(out)
    assert data["error"] is True


@pytest.mark.asyncio
@respx.mock
async def test_fetch_url_blocks_private(monkeypatch):
    monkeypatch.setenv("AGENT_URL_FETCH_ENABLED", "true")
    out = await fetch_url(
        url="http://127.0.0.1/secret",
        _context={"web_search_enabled": True, "url_fetch_enabled": True},
    )
    data = json.loads(out)
    assert data["error"] is True
    assert "url_blocked" in data["message"]


@pytest.mark.asyncio
@respx.mock
async def test_fetch_url_returns_untrusted_text(monkeypatch):
    monkeypatch.setenv("AGENT_URL_FETCH_ENABLED", "true")

    monkeypatch.setattr(
        "agent_core.tools.fetch_url.validate_outbound_url",
        lambda url: (True, "ok"),
    )
    respx.get("https://example.gov.in/policy").mock(
        return_value=Response(200, text="<html><body><p>Policy text</p></body></html>")
    )
    out = await fetch_url(
        url="https://example.gov.in/policy",
        _context={"web_search_enabled": True, "url_fetch_enabled": True},
    )
    assert "UNTRUSTED_WEB" in out
    assert "Policy text" in out


@pytest.mark.asyncio
@respx.mock
async def test_fetch_url_revalidates_redirect_targets(monkeypatch):
    monkeypatch.setenv("AGENT_URL_FETCH_ENABLED", "true")
    seen: list[str] = []

    def _validate(url: str):
        seen.append(url)
        if "169.254.169.254" in url:
            return (False, "resolved_private")
        return (True, "ok")

    monkeypatch.setattr("agent_core.tools.fetch_url.validate_outbound_url", _validate)
    respx.get("https://example.gov.in/start").mock(
        return_value=Response(302, headers={"location": "http://169.254.169.254/latest/meta-data"})
    )

    out = await fetch_url(
        url="https://example.gov.in/start",
        _context={"web_search_enabled": True, "url_fetch_enabled": True},
    )
    data = json.loads(out)
    assert data["error"] is True
    assert data["message"] == "url_blocked:resolved_private"
    assert "https://example.gov.in/start" in seen
    assert any("169.254.169.254" in url for url in seen)


def test_register_internet_tools_idempotent():
    reg = ToolRegistry()
    register_internet_tools(reg)
    register_internet_tools(reg)
    names = {s.name for s in reg.list_specs()}
    assert "web_search" in names
    assert "fetch_url" in names
