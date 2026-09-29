"""Register, validate, and execute async agent tools."""

from __future__ import annotations

import asyncio
import json
import os
from collections.abc import Awaitable, Callable
from typing import Any

import httpx
import structlog

from agent_core.capability_registry import CapabilityNotFound, capability_registry
from agent_core.schemas import ToolCallRequest, ToolSpec
from agent_core.tool_calling import validate_tool_arguments

log = structlog.get_logger(__name__)

ToolHandler = Callable[..., Awaitable[str]]
MAX_TOOL_RESULT_BYTES = 32_768
DEFAULT_TOOL_TIMEOUT_SEC = 30.0


class ToolNotAllowedError(KeyError):
    """Raised when the agent requests an unregistered tool."""


class ToolRegistry:
    def __init__(self, *, default_timeout_sec: float = DEFAULT_TOOL_TIMEOUT_SEC) -> None:
        self._tools: dict[str, tuple[ToolSpec, ToolHandler]] = {}
        self.default_timeout_sec = default_timeout_sec

    def register(self, spec: ToolSpec, handler: ToolHandler) -> None:
        if not spec.name or not spec.name.isidentifier():
            raise ValueError(f"Invalid tool name: {spec.name!r}")
        self._tools[spec.name] = (spec, handler)

    def list_specs(self) -> list[ToolSpec]:
        return [spec for spec, _ in self._tools.values()]

    def has_tool(self, name: str) -> bool:
        return name in self._tools

    def allowed_for_mode(self, mode: str, config_tool_names: list[str] | None = None) -> set[str]:
        """Tool allowlist per agent mode (agent = config list or all registered)."""
        if mode != "agent":
            return set()
        if config_tool_names:
            return {n for n in config_tool_names if self.has_tool(n)}
        return set(self._tools.keys())

    async def execute(
        self,
        call: ToolCallRequest,
        *,
        ctx: Any = None,
        _context: dict[str, Any] | None = None,
        timeout_sec: float | None = None,
    ) -> str:
        entry = self._tools.get(call.name)
        if entry is None:
            raise ToolNotAllowedError(call.name)
        spec, handler = entry
        valid, reason = validate_tool_arguments(spec, call.arguments)
        if not valid:
            raise ValueError(f"Invalid arguments for {call.name}: {reason}")

        context = dict(_context or {})
        if ctx is not None:
            context["ctx"] = ctx
            for key in ("tenant_id", "user_id", "session_id", "product"):
                val = getattr(ctx, key, None)
                if val is not None and key not in context:
                    context[key] = val
        tenant_id = getattr(ctx, "tenant_id", context.get("tenant_id"))
        user_id = getattr(ctx, "user_id", context.get("user_id"))
        log.info(
            "agent_tool_execute",
            tool_name=call.name,
            tenant_id=tenant_id,
            user_id=user_id,
        )
        timeout = timeout_sec if timeout_sec is not None else self.default_timeout_sec
        try:
            result = await asyncio.wait_for(
                handler(**call.arguments, _context=context),
                timeout=timeout,
            )
        except asyncio.TimeoutError as exc:
            log.warning("agent_tool_execute_timeout", tool_name=call.name, tenant_id=tenant_id)
            raise TimeoutError(f"Tool {call.name} timed out after {timeout}s") from exc

        if not isinstance(result, str):
            result = json.dumps(result, ensure_ascii=False)
        if len(result.encode("utf-8")) > MAX_TOOL_RESULT_BYTES:
            raise ValueError(f"Tool {call.name} result exceeds {MAX_TOOL_RESULT_BYTES} bytes")
        return result


async def dispatch_mcp(
    capability_name: str,
    args: dict[str, Any],
    tenant_id: str,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """Dispatch a capability call to its registered MCP server via HTTP."""
    cap = capability_registry.resolve(capability_name)
    url = f"{cap.mcp_server_url}/mcp/tools/call"
    headers: dict[str, str] = {
        "X-Tenant-Id": tenant_id,
        "X-Capability": capability_name,
    }
    mcp_secret = os.getenv("MCP_SHARED_SECRET", "")
    if mcp_secret:
        headers["X-MCP-Secret"] = mcp_secret

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.post(
                url,
                json={"tool": cap.tool_name, "arguments": args},
                headers=headers,
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise RuntimeError(
                f"MCP tool call failed: {e.response.status_code} {e.response.text}"
            ) from e
        except httpx.RequestError as e:
            raise RuntimeError(
                f"MCP server unreachable for capability '{capability_name}': {e}"
            ) from e
