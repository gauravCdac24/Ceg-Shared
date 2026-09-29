"""Tests for Sprint 5 handoff capabilities."""
import pytest
from agent_core.capability_registry import capability_registry


def test_handoff_capabilities_registered():
    caps = capability_registry.list_all()
    handoff_caps = [c for c in caps if c.capability_name.startswith("handoff_to_")]
    assert len(handoff_caps) >= 4, f"Expected >= 4 handoff capabilities, got {len(handoff_caps)}"


def test_handoff_to_quizforge_resolves():
    cap = capability_registry.resolve("handoff_to_quizforge")
    assert cap.tool_name == "run_agent_task"
    assert cap.product == "quizforge"


def test_handoff_to_certstudio_resolves():
    cap = capability_registry.resolve("handoff_to_certstudio")
    assert cap.tool_name == "run_agent_task"
    assert cap.product == "certstudio"


def test_handoff_to_workshopos_resolves():
    cap = capability_registry.resolve("handoff_to_workshopos")
    assert cap.tool_name == "run_agent_task"
    assert cap.product == "workshopos"


def test_handoff_to_fetchdesk_resolves():
    cap = capability_registry.resolve("handoff_to_fetchdesk")
    assert cap.tool_name == "run_agent_task"
    assert cap.product == "fetchdesk"


def test_handoff_capabilities_not_approval_required():
    for name in ["handoff_to_quizforge", "handoff_to_certstudio", "handoff_to_workshopos", "handoff_to_fetchdesk"]:
        cap = capability_registry.resolve(name)
        assert cap.requires_approval is False, f"{name} should not require approval"
