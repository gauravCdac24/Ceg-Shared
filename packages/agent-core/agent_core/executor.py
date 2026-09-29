"""Tool execution with validation, timeout, and structured logging."""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import structlog

from agent_core.mutation_preview_gate import (
    check_mutation_commit_allowed,
    wrap_mutation_preview_result,
)
from agent_core.schemas import StepEvent, ToolCallRequest
from agent_core.tool_calling import validate_tool_arguments
from agent_core.tool_registry import ToolNotAllowedError, ToolRegistry

log = structlog.get_logger(__name__)

DEFAULT_TOOL_TIMEOUT_SEC = 30.0
MAX_MALFORMED_RETRIES = 2


@dataclass
class ToolExecutionResult:
    name: str
    ok: bool
    result: str
    error: str | None = None
    denied: bool = False
    # Sprint 2: step tracking
    step_id: str | None = None
    step_name: str | None = None


class Executor:
    def __init__(
        self,
        *,
        registry: ToolRegistry,
        timeout_sec: float = DEFAULT_TOOL_TIMEOUT_SEC,
        allowed_tools: set[str] | None = None,
        budget: "ToolExecutionBudget | None" = None,
    ) -> None:
        self._registry = registry
        self._timeout_sec = timeout_sec
        self._allowed_tools = allowed_tools
        self._budget = budget

    async def execute_batch(
        self,
        calls: list[ToolCallRequest],
        *,
        ctx: Any,
        context: dict[str, Any],
        require_confirmation: set[str] | None = None,
        confirmed_tools: set[str] | None = None,
        redis_client: Any = None,
        job_id: str | None = None,
    ) -> list[ToolExecutionResult]:
        results: list[ToolExecutionResult] = []
        for call in calls:
            results.append(
                await self.execute_one(
                    call,
                    ctx=ctx,
                    context=context,
                    require_confirmation=require_confirmation,
                    confirmed_tools=confirmed_tools,
                    redis_client=redis_client,
                    job_id=job_id,
                )
            )
        return results

    async def execute_one(
        self,
        call: ToolCallRequest,
        *,
        ctx: Any,
        context: dict[str, Any],
        require_confirmation: set[str] | None = None,
        confirmed_tools: set[str] | None = None,
        redis_client: Any = None,
        job_id: str | None = None,
        step_id: str | None = None,
        step_name: str | None = None,
    ) -> ToolExecutionResult:
        if self._allowed_tools is not None and call.name not in self._allowed_tools:
            return ToolExecutionResult(
                name=call.name,
                ok=False,
                result=json.dumps({"error": "tool_not_allowed", "tool": call.name}),
                error="tool_not_in_allowlist",
                denied=True,
            )
        if require_confirmation and call.name in require_confirmation:
            if call.name not in (confirmed_tools or set()) and not call.arguments.get("confirmed"):
                return ToolExecutionResult(
                    name=call.name,
                    ok=False,
                    result=json.dumps(
                        {
                            "requires_confirmation": True,
                            "tool": call.name,
                            "message": "User confirmation required before running this tool.",
                        }
                    ),
                    error="confirmation_required",
                )
        if self._budget is not None and not self._budget.record_tool(call.name):
            return ToolExecutionResult(
                name=call.name,
                ok=False,
                result=json.dumps({"error": "tool_budget_exceeded", "tool": call.name}),
                error="tool_budget_exceeded",
                denied=True,
            )
        commit_ok, commit_reason = check_mutation_commit_allowed(
            call.name,
            call.arguments,
            context=context,
        )
        if not commit_ok:
            return ToolExecutionResult(
                name=call.name,
                ok=False,
                result=json.dumps(
                    {
                        "error": commit_reason,
                        "tool": call.name,
                        "message": "Preview is required before committing this change.",
                    }
                ),
                error=commit_reason,
                denied=True,
            )
        entry = self._registry._tools.get(call.name)  # noqa: SLF001
        if entry is None:
            return ToolExecutionResult(
                name=call.name,
                ok=False,
                result=json.dumps({"error": "tool_not_allowed", "tool": call.name}),
                error="unregistered",
                denied=True,
            )
        spec, _handler = entry
        valid, reason = validate_tool_arguments(spec, call.arguments)
        if not valid:
            return ToolExecutionResult(
                name=call.name,
                ok=False,
                result=json.dumps({"error": "invalid_arguments", "reason": reason}),
                error=reason,
            )

        # Emit running step event if redis is available (Sprint 2)
        _step_id = step_id or call.name
        _step_name = step_name or call.name
        if redis_client is not None and job_id:
            try:
                from agent_core.stream_bridge import emit_step_event
                await emit_step_event(
                    redis_client,
                    job_id,
                    StepEvent(
                        step_id=_step_id,
                        step_name=_step_name,
                        tool_called=call.name,
                        status="running",
                        started_at=datetime.now(timezone.utc),
                    ),
                )
            except Exception:
                pass  # never block execution for event emission failures

        last_exc: Exception | None = None
        for attempt in range(MAX_MALFORMED_RETRIES):
            try:
                # Pass the same ceiling into the registry — otherwise registry
                # default (30s) kills long tools (e.g. handle_recreate_intent /
                # generate_canvas_code) while the outer wait_for still has headroom.
                result = await asyncio.wait_for(
                    self._registry.execute(
                        call,
                        ctx=ctx,
                        _context=context,
                        timeout_sec=self._timeout_sec,
                    ),
                    timeout=self._timeout_sec + 1.0,
                )
                log.info(
                    "agent_executor_tool_ok",
                    tool=call.name,
                    tenant_id=context.get("tenant_id"),
                    attempt=attempt + 1,
                )
                # Emit done step event
                if redis_client is not None and job_id:
                    try:
                        from agent_core.stream_bridge import emit_step_event
                        await emit_step_event(
                            redis_client,
                            job_id,
                            StepEvent(
                                step_id=_step_id,
                                step_name=_step_name,
                                tool_called=call.name,
                                status="done",
                                started_at=datetime.now(timezone.utc),
                                result_summary=result[:200] if isinstance(result, str) else None,
                            ),
                        )
                    except Exception:
                        pass
                if isinstance(result, str):
                    result = wrap_mutation_preview_result(
                        call.name,
                        result,
                        arguments=call.arguments,
                        context=context,
                    )
                return ToolExecutionResult(
                    name=call.name, ok=True, result=result,
                    step_id=_step_id, step_name=_step_name,
                )
            except ToolNotAllowedError:
                return ToolExecutionResult(
                    name=call.name,
                    ok=False,
                    result=json.dumps({"error": "tool_not_allowed", "tool": call.name}),
                    error="denied",
                    denied=True,
                )
            except asyncio.TimeoutError:
                log.warning("agent_tool_timeout", tool=call.name, timeout=self._timeout_sec)
                return ToolExecutionResult(
                    name=call.name,
                    ok=False,
                    result=json.dumps({"error": "tool_timeout", "tool": call.name}),
                    error="timeout",
                )
            except Exception as exc:
                last_exc = exc
                log.exception(
                    "agent_executor_tool_failed",
                    tool=call.name,
                    tenant_id=context.get("tenant_id"),
                    attempt=attempt + 1,
                )
        msg = str(last_exc)[:500] if last_exc else "unknown"
        return ToolExecutionResult(
            name=call.name,
            ok=False,
            result=json.dumps({"error": "tool_failed", "message": msg}),
            error=msg,
        )
