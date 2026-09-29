"""Base class for product MCP servers with capability registry integration.

MCP secret rotation (Sprint-4 #29):
  1. Prefer per-product env: CEG_MCP_SECRET, WORKSHOPOS_MCP_SECRET, QUIZFORGE_MCP_SECRET,
     CERTSTUDIO_MCP_SECRET, FETCHDESK_MCP_SECRET.
  2. Fleet-wide MCP_SHARED_SECRET remains a fallback (deprecation warning logged each resolve).
  3. Rotate: set the new per-product secret on all MCP servers + callers, deploy, then remove
     the old secret / MCP_SHARED_SECRET. Never commit secrets; use vault/K8s secrets.
  4. Outside local/dev, a secret is required. Non-loopback bind always requires a secret.
"""
from __future__ import annotations

import asyncio
import functools
import inspect
import os
from collections.abc import Callable
from typing import Any

import structlog

from agent_core.capability_registry import CapabilityNotFound, CapabilityRef, capability_registry
from agent_core.env_resolver import MCP_TOOL_TIMEOUT_SEC, resolve_int_env
from agent_core.mcp_tenant import MCPTenantDenied, require_mcp_tenant_id, tenant_denied_payload

logger = structlog.get_logger()

try:
    from mcp.server.fastmcp import FastMCP
    HAS_MCP = True
except ImportError:
    HAS_MCP = False
    logger.warning("mcp package not installed — MCP servers will run in stub mode")

try:
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.responses import JSONResponse as StarletteJSONResponse
    HAS_STARLETTE = True
except ImportError:
    HAS_STARLETTE = False

_PRODUCT_SECRET_ENV: dict[str, str] = {
    "ceg": "CEG_MCP_SECRET",
    "workshopos": "WORKSHOPOS_MCP_SECRET",
    "quizforge": "QUIZFORGE_MCP_SECRET",
    "certstudio": "CERTSTUDIO_MCP_SECRET",
    "fetchdesk": "FETCHDESK_MCP_SECRET",
}


def resolve_mcp_secret(product_name: str) -> str:
    """Per-product MCP secret with fleet-wide MCP_SHARED_SECRET fallback."""
    key = _PRODUCT_SECRET_ENV.get((product_name or "").strip().lower().replace("_", "-"), "")
    # normalize: cert-studio style unlikely; product_name uses certstudio
    key = _PRODUCT_SECRET_ENV.get((product_name or "").strip().lower(), key)
    if key:
        product_secret = (os.getenv(key) or "").strip()
        if product_secret:
            return product_secret
    fleet = (os.getenv("MCP_SHARED_SECRET") or "").strip()
    if fleet:
        logger.warning(
            "mcp_shared_secret_deprecated",
            product=product_name,
            use_instead=key or f"{(product_name or 'PRODUCT').upper()}_MCP_SECRET",
        )
        return fleet
    return ""


def _is_non_local_environment() -> bool:
    env = (os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "development").strip().lower()
    return env not in {"", "local", "dev", "development", "test"}


def _is_loopback_bind(host: str) -> bool:
    candidate = (host or "").strip().lower()
    return candidate in {"127.0.0.1", "localhost", "::1"}


class MCPAuthMiddleware:
    """Validate X-MCP-Secret header (per-product or fleet secret)."""

    def __init__(self, app: Any, *, product_name: str = "") -> None:
        self.app = app
        self.product_name = product_name

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        if scope["type"] == "http":
            secret = resolve_mcp_secret(self.product_name)
            if _is_non_local_environment() and not secret:
                from starlette.responses import JSONResponse

                response = JSONResponse(
                    {"error": "MCP secret required outside local environments"},
                    status_code=503,
                )
                await response(scope, receive, send)
                return
            if secret:
                headers = dict(scope.get("headers", []))
                provided = headers.get(b"x-mcp-secret", b"").decode("utf-8", errors="replace")
                if provided != secret:
                    from starlette.responses import JSONResponse
                    response = JSONResponse({"error": "Unauthorized"}, status_code=401)
                    await response(scope, receive, send)
                    return
        await self.app(scope, receive, send)


class ProductMCPServer:
    """Wraps FastMCP with capability registry integration."""

    def __init__(self, product_name: str, version: str = "1.0", description: str = "") -> None:
        self.product_name = product_name
        self.version = version
        self.description = description
        if HAS_MCP:
            self._mcp: Any = FastMCP(f"{product_name}-mcp-server")
        else:
            self._mcp = None
        self._tools: list[dict[str, str]] = []

    def register_tool(
        self,
        fn: Callable,
        capability_tag: str,
        description: str,
        requires_approval: bool = False,
        input_schema: dict | None = None,
    ) -> None:
        """Register a tool function as an MCP tool and in the capability registry."""
        tool_name = fn.__name__
        wrapped = self._wrap_tool_with_timeout(fn, tool_name)

        if HAS_MCP and self._mcp is not None:
            self._mcp.tool(name=tool_name, description=description)(wrapped)

        self._tools.append({"tool_name": tool_name, "capability_tag": capability_tag})

        mcp_url_env = f"{self.product_name.upper().replace('-', '_')}_MCP_URL"
        server_url = os.getenv(mcp_url_env, "http://localhost:8000")

        try:
            capability_registry.resolve(capability_tag)
        except CapabilityNotFound:
            capability_registry.register(
                CapabilityRef(
                    capability_name=capability_tag,
                    product=self.product_name,
                    mcp_server_url=server_url,
                    tool_name=tool_name,
                    description=description,
                    requires_approval=requires_approval,
                    input_schema=input_schema or {},
                )
            )
        logger.info(
            "mcp_server.tool_registered",
            product=self.product_name,
            tool=tool_name,
            capability=capability_tag,
        )

    def _wrap_tool_with_timeout(self, fn: Callable, tool_name: str) -> Callable:
        """Bound MCP tool execution with MCP_TOOL_TIMEOUT_SEC + tenant gate."""
        timeout_sec = float(resolve_int_env(MCP_TOOL_TIMEOUT_SEC, profile_default=30))

        if inspect.iscoroutinefunction(fn):

            @functools.wraps(fn)
            async def async_wrapped(*args: Any, **kwargs: Any) -> Any:
                try:
                    tid = require_mcp_tenant_id(
                        kwargs.get("_tenant_id") or kwargs.get("tenant_id")
                    )
                    if tid:
                        kwargs["_tenant_id"] = tid
                    return await asyncio.wait_for(fn(*args, **kwargs), timeout=timeout_sec)
                except MCPTenantDenied as exc:
                    logger.warning(
                        "mcp_tool_tenant_denied",
                        tool=tool_name,
                        product=self.product_name,
                        code=exc.code,
                    )
                    return tenant_denied_payload(exc)
                except asyncio.TimeoutError:
                    logger.warning("mcp_tool_timeout", tool=tool_name, timeout_sec=timeout_sec)
                    return {"error": "tool_timeout", "tool": tool_name}

            return async_wrapped

        @functools.wraps(fn)
        def sync_wrapped(*args: Any, **kwargs: Any) -> Any:
            try:
                tid = require_mcp_tenant_id(
                    kwargs.get("_tenant_id") or kwargs.get("tenant_id")
                )
                if tid:
                    kwargs["_tenant_id"] = tid
                return fn(*args, **kwargs)
            except MCPTenantDenied as exc:
                logger.warning(
                    "mcp_tool_tenant_denied",
                    tool=tool_name,
                    product=self.product_name,
                    code=exc.code,
                )
                return tenant_denied_payload(exc)

        return sync_wrapped

    def list_tools(self) -> list[dict[str, str]]:
        return self._tools

    def run(self, host: str = "127.0.0.1", port: int = 8000) -> None:
        secret = resolve_mcp_secret(self.product_name)
        if _is_non_local_environment() and not secret:
            raise RuntimeError(
                f"Set { _PRODUCT_SECRET_ENV.get(self.product_name, 'PRODUCT_MCP_SECRET') } "
                "or MCP_SHARED_SECRET outside local environments"
            )
        if not _is_loopback_bind(host) and not secret:
            raise RuntimeError("Refusing non-loopback MCP bind without MCP secret")
        if HAS_MCP and self._mcp is not None:
            import uvicorn

            app = self._mcp.get_asgi_app()
            app = MCPAuthMiddleware(app, product_name=self.product_name)
            uvicorn.run(app, host=host, port=port)
        else:
            logger.error("mcp_server.cannot_run_without_mcp_package")
            raise RuntimeError("Install 'mcp' package to run MCP server")
