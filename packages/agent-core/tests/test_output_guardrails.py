from __future__ import annotations

from agent_core.guardrails import OutputGuardrails
from agent_core.schemas import AgentMode, ToolSpec
from agent_core.tool_calling import extract_regex_tool_calls
from agent_core.tool_registry import ToolRegistry


def test_tool_syntax_blocked_in_ask_mode():
    guard = OutputGuardrails()
    reg = ToolRegistry()
    result = guard.validate(
        'Answer: [TOOL:generate_questions]{"topic":"x"}[/TOOL]',
        mode=AgentMode.ask,
        registry=reg,
    )
    assert not result.allowed


def test_unregistered_tool_blocked():
    guard = OutputGuardrails()
    reg = ToolRegistry()
    result = guard.validate(
        '[TOOL:unknown_tool]{"a":1}[/TOOL]',
        mode=AgentMode.agent,
        registry=reg,
    )
    assert not result.allowed


def test_malformed_tool_json_salvaged():
    calls = extract_regex_tool_calls('[TOOL:generate_questions]{"topic":"census"[/TOOL]')
    assert len(calls) == 1
    assert calls[0].name == "generate_questions"
