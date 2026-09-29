"""RecoveryLoop unit tests."""



from __future__ import annotations



from agent_core.executor import ToolExecutionResult

from agent_core.recovery_loop import RecoveryLoop





def test_denied_tool_not_retryable() -> None:

    plan = RecoveryLoop().diagnose(

        [ToolExecutionResult(name="issue_bulk", ok=False, result="{}", error="tool_not_allowed", denied=True)]

    )

    assert plan.actions

    assert plan.actions[0].retry_allowed is False

    assert "not allowed" in plan.actions[0].message





def test_timeout_is_retryable() -> None:

    plan = RecoveryLoop().diagnose(

        [ToolExecutionResult(name="canvas_analyze", ok=False, result="{}", error="timeout")]

    )

    assert plan.actions[0].retry_allowed is True

    assert plan.hint_for_llm

