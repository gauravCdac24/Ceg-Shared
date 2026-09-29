"""Tenant-level agent capability policy (stored in tenant ai_settings JSON)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class TenantAgentCapabilities(BaseModel):
    """Nested under tenant ai_settings.agent_capabilities — no migration required."""

    web_search_allowed: bool = True
    web_search_default: bool = False
    url_fetch_allowed: bool = True
    pdf_parse_allowed: bool = True
    image_vision_allowed: bool = True
    debug_mode_allowed: bool = True


def parse_tenant_agent_capabilities(raw: dict[str, Any] | None) -> TenantAgentCapabilities:
    if not raw or not isinstance(raw, dict):
        return TenantAgentCapabilities()
    block = raw.get("agent_capabilities")
    if not isinstance(block, dict):
        return TenantAgentCapabilities()
    try:
        return TenantAgentCapabilities.model_validate(block)
    except Exception:
        return TenantAgentCapabilities()


def tenant_capabilities_to_public(
    caps: TenantAgentCapabilities,
    *,
    flags: Any | None = None,
) -> dict[str, Any]:
    from agent_core.capability_flags import load_capability_flags

    env = flags or load_capability_flags()
    return {
        "web_search_allowed": caps.web_search_allowed and env.web_search,
        "web_search_default": caps.web_search_default and caps.web_search_allowed and env.web_search,
        "url_fetch_allowed": caps.url_fetch_allowed and env.url_fetch,
        "pdf_parse_allowed": caps.pdf_parse_allowed and env.pdf_parse,
        "image_vision_allowed": caps.image_vision_allowed and env.image_vision,
        "debug_mode_allowed": caps.debug_mode_allowed and env.debug_mode,
        "platform_web_search": env.web_search,
        "platform_pdf_parse": env.pdf_parse,
    }
