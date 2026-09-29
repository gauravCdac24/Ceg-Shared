from __future__ import annotations

import pytest

from agent_core.executor import ToolExecutionResult
from agent_core.self_healing import SelfHealing


@pytest.mark.asyncio
async def test_heal_tool_batch_detects_failures():
    healing = SelfHealing()
    results = [
        ToolExecutionResult(name="a", ok=False, result="{}", error="timeout"),
        ToolExecutionResult(name="b", ok=True, result='{"ok":true}'),
    ]
    outcome = await healing.heal_tool_batch(results)
    assert outcome.recovery.hint_for_llm
    assert "a" in outcome.rollback_tools or any("a" in a.message for a in outcome.recovery.actions)


def test_destructive_tools_require_confirmation():
    healing = SelfHealing()
    required = healing.tools_requiring_confirmation({"create_end_to_end_workflow", "echo"})
    assert "create_end_to_end_workflow" in required
