from __future__ import annotations

import pytest

from agent_core.mcp_server_base import ProductMCPServer, _is_loopback_bind


def test_is_loopback_bind_detects_local_hosts():
    assert _is_loopback_bind("127.0.0.1") is True
    assert _is_loopback_bind("localhost") is True
    assert _is_loopback_bind("::1") is True
    assert _is_loopback_bind("0.0.0.0") is False


def test_product_mcp_server_run_requires_secret_non_local(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("MCP_SHARED_SECRET", raising=False)
    server = ProductMCPServer("test-product")
    with pytest.raises(RuntimeError, match="MCP_SHARED_SECRET must be set"):
        server.run(host="127.0.0.1", port=9999)


def test_product_mcp_server_run_refuses_public_bind_without_secret(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "local")
    monkeypatch.delenv("MCP_SHARED_SECRET", raising=False)
    server = ProductMCPServer("test-product")
    with pytest.raises(RuntimeError, match="Refusing non-loopback MCP bind"):
        server.run(host="0.0.0.0", port=9999)
