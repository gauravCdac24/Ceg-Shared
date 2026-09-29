from __future__ import annotations

from agent_core.schemas import ToolSpec
from agent_core.tool_calling import (
    extract_regex_tool_calls,
    extract_tool_calls,
    parse_native_tool_calls,
    specs_to_ollama_tools,
    validate_tool_arguments,
)


def test_specs_to_ollama_tools():
    specs = [ToolSpec(name="echo", description="Echo back", parameters_schema={"type": "object", "properties": {}})]
    tools = specs_to_ollama_tools(specs)
    assert tools[0]["function"]["name"] == "echo"


def test_parse_native_tool_calls():
    raw = [{"function": {"name": "echo", "arguments": {"message": "hi"}}}]
    calls = parse_native_tool_calls(raw)
    assert calls[0].name == "echo"
    assert calls[0].arguments["message"] == "hi"


def test_extract_tool_calls_prefers_native():
    native = [{"function": {"name": "a", "arguments": {}}}]
    calls, source = extract_tool_calls(text="", native_calls=native)
    assert source == "native"
    assert calls[0].name == "a"


def test_regex_fallback_deprecated():
    text = 'x [TOOL:echo]{"message":"hi"}[/TOOL]'
    calls = extract_regex_tool_calls(text)
    assert calls[0].name == "echo"


def test_validate_tool_arguments_required():
    spec = ToolSpec(
        name="t",
        description="d",
        parameters_schema={"type": "object", "required": ["q"], "properties": {"q": {"type": "string"}}},
    )
    ok, reason = validate_tool_arguments(spec, {})
    assert not ok
    assert reason == "missing_required:q"
