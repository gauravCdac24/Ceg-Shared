from __future__ import annotations

import json

import pytest

from agent_core.executor import Executor
from agent_core.mutation_preview_gate import (
    check_mutation_commit_allowed,
    wrap_mutation_preview_result,
)
from agent_core.schemas import ToolCallRequest, ToolSpec
from agent_core.tool_registry import ToolRegistry


def test_mutation_requires_prior_ghost():
    context: dict = {}
    ok, reason = check_mutation_commit_allowed(
        "canvas_set_background",
        {"committed": True, "ghost_id": "missing"},
        context=context,
    )
    assert ok is False
    assert reason == "mutation_commit_without_preview"


def test_mutation_commit_after_preview_allowed():
    context: dict = {"_session_ghost_ids": {"ghost-1"}}
    ok, reason = check_mutation_commit_allowed(
        "canvas_set_background",
        {"committed": True, "ghost_id": "ghost-1"},
        context=context,
    )
    assert ok is True
    assert reason is None
    assert "ghost-1" not in context["_session_ghost_ids"]


def test_wrap_mutation_preview_registers_ghost():
    context: dict = {}
    raw = json.dumps({"action": {"type": "set_background_color", "color": "#fff"}})
    wrapped = wrap_mutation_preview_result(
        "canvas_set_background",
        raw,
        arguments={},
        context=context,
    )
    data = json.loads(wrapped)
    assert data["preview"] is True
    assert data["committed"] is False
    assert data["ghost_id"]
    assert data["ghost_id"] in context["_session_ghost_ids"]


@pytest.mark.asyncio
async def test_executor_rejects_direct_commit_without_ghost():
    registry = ToolRegistry()

    async def _handler(**_kwargs):
        return json.dumps({"committed": True})

    registry.register(
        ToolSpec(
            name="canvas_set_background",
            description="test",
            parameters={"type": "object", "properties": {}},
        ),
        _handler,
    )
    executor = Executor(registry=registry)
    result = await executor.execute_one(
        ToolCallRequest(name="canvas_set_background", arguments={"committed": True}),
        ctx=None,
        context={},
    )
    assert result.ok is False
    assert result.error == "mutation_commit_without_preview"
