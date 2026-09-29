from __future__ import annotations

import json

import pytest

from agent_core.agent_runner import AgentContext
from agent_core.schemas import AgentProduct, ToolCallRequest, ToolSpec
from agent_core.tool_registry import ToolNotAllowedError, ToolRegistry


async def _echo_handler(message: str = "", _context: dict | None = None) -> str:
    ctx = _context or {}
    return json.dumps({"echo": message, "tenant": ctx.get("tenant_id")})


@pytest.mark.asyncio
async def test_register_and_execute():
    reg = ToolRegistry()
    reg.register(
        ToolSpec(name="echo", description="echo", parameters_schema={"message": "string"}),
        _echo_handler,
    )
    ctx = AgentContext(
        tenant_id="t1",
        user_id="u1",
        product=AgentProduct.quizforge,
        session_id="s1",
    )
    out = await reg.execute(
        ToolCallRequest(name="echo", arguments={"message": "hi"}),
        ctx=ctx,
        _context={"tenant_id": "t1"},
    )
    data = json.loads(out)
    assert data["echo"] == "hi"
    assert data["tenant"] == "t1"


@pytest.mark.asyncio
async def test_unknown_tool_raises():
    reg = ToolRegistry()
    with pytest.raises(ToolNotAllowedError):
        await reg.execute(ToolCallRequest(name="missing"), _context={})
