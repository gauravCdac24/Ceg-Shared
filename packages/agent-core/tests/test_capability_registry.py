"""Tests for CapabilityRegistry and built-in capability registrations."""
import pytest

from agent_core.capability_registry import (
    CapabilityNotFound,
    CapabilityRef,
    CapabilityRegistry,
    capability_registry,
)


def test_register_and_resolve():
    reg = CapabilityRegistry()
    ref = CapabilityRef(
        capability_name="test_cap",
        product="test",
        mcp_server_url="http://localhost:9999",
        tool_name="test_fn",
        description="test",
    )
    reg.register(ref)
    resolved = reg.resolve("test_cap")
    assert resolved.tool_name == "test_fn"


def test_resolve_unknown_raises():
    reg = CapabilityRegistry()
    with pytest.raises(CapabilityNotFound):
        reg.resolve("nonexistent_capability")


def test_list_all_returns_registered():
    reg = CapabilityRegistry()
    reg.register(CapabilityRef(
        capability_name="cap_a", product="p1",
        mcp_server_url="http://localhost:1", tool_name="fn_a", description="a",
    ))
    reg.register(CapabilityRef(
        capability_name="cap_b", product="p2",
        mcp_server_url="http://localhost:2", tool_name="fn_b", description="b",
    ))
    names = [c.capability_name for c in reg.list_all()]
    assert "cap_a" in names
    assert "cap_b" in names


def test_list_for_product():
    reg = CapabilityRegistry()
    reg.register(CapabilityRef(
        capability_name="cap_x", product="alpha",
        mcp_server_url="http://localhost:1", tool_name="fn_x", description="x",
    ))
    reg.register(CapabilityRef(
        capability_name="cap_y", product="beta",
        mcp_server_url="http://localhost:2", tool_name="fn_y", description="y",
    ))
    alpha = reg.list_for_product("alpha")
    assert len(alpha) == 1
    assert alpha[0].capability_name == "cap_x"


def test_builtin_capabilities_count():
    caps = capability_registry.list_all()
    assert len(caps) >= 15, f"Expected >= 15 builtin capabilities, got {len(caps)}"


def test_builtin_includes_create_quiz():
    cap = capability_registry.resolve("create_quiz")
    assert cap.product == "quizforge"


def test_builtin_includes_bulk_issue():
    cap = capability_registry.resolve("bulk_issue_certificates")
    assert cap.product == "certstudio"


def test_builtin_bulk_issue_requires_approval():
    cap = capability_registry.resolve("bulk_issue_certificates")
    assert cap.requires_approval is True


def test_builtin_workshopos_present():
    caps = capability_registry.list_for_product("workshopos")
    assert len(caps) >= 2


def test_builtin_fetchdesk_present():
    caps = capability_registry.list_for_product("fetchdesk")
    assert len(caps) >= 3
