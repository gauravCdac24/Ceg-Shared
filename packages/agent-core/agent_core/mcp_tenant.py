"""MCP tenant isolation helpers (Sprint-4 #32 / #51).

Every MCP tool path must resolve a tenant_id before touching tenant-scoped data.
Missing tenant in staging/production is a hard deny — never silent empty-string pass-through.
"""

from __future__ import annotations

import os


class MCPTenantDenied(PermissionError):
    """Raised when MCP tool lacks a usable tenant or tenant mismatches ownership."""

    def __init__(self, message: str = "tenant_id required", *, code: str = "tenant_denied") -> None:
        super().__init__(message)
        self.code = code
        self.status_code = 403


def _strict_env() -> bool:
    env = (os.environ.get("ENVIRONMENT") or os.environ.get("APP_ENV") or "development").strip().lower()
    return env in {"production", "prod", "uat", "staging"}


def require_mcp_tenant_id(raw: object) -> str:
    """Return stripped tenant_id or deny in strict environments when missing."""
    tenant_id = str(raw or "").strip()
    if tenant_id:
        return tenant_id
    if _strict_env():
        raise MCPTenantDenied("tenant_id required for MCP tool", code="tenant_missing")
    return ""


def assert_tenant_match(*, claimed: object, owning: object) -> str:
    """Deny when claimed tenant does not match the resource-owning tenant."""
    claimed_id = require_mcp_tenant_id(claimed)
    owning_id = str(owning or "").strip()
    if not owning_id:
        # Ownership unknown — still require claimed in strict env (already enforced).
        return claimed_id
    if claimed_id and claimed_id != owning_id:
        raise MCPTenantDenied(
            "tenant_id does not match resource owner",
            code="tenant_mismatch",
        )
    if not claimed_id and _strict_env():
        raise MCPTenantDenied("tenant_id required for MCP tool", code="tenant_missing")
    return claimed_id or owning_id


def tenant_denied_payload(exc: MCPTenantDenied) -> dict[str, str]:
    return {"error": exc.code, "detail": str(exc)}
