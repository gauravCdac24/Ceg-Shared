"""Register shared internet tools and filter by session capabilities."""

from __future__ import annotations

from typing import Any

from agent_core.capability_flags import INTERNET_TOOL_NAMES, CapabilityFlags, load_capability_flags
from agent_core.schemas import SessionCapabilities, ToolSpec
from agent_core.tenant_agent_settings import TenantAgentCapabilities, parse_tenant_agent_capabilities
from agent_core.tool_registry import ToolRegistry
from agent_core.tools.fetch_url import fetch_url
from agent_core.tools.web_search import web_search

WEB_SEARCH_SPEC = ToolSpec(
    name="web_search",
    description=(
        "Search the internet for current information. Use when the user asks about recent "
        "events, policies, news, or anything that may have changed after your training cutoff. "
        "Always cite sources with URL and date. Requires web search enabled for this chat."
    ),
    parameters_schema={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Precise search query (4-8 words)"},
            "max_results": {"type": "integer", "default": 5, "maximum": 10},
        },
        "required": ["query"],
    },
)

FETCH_URL_SPEC = ToolSpec(
    name="fetch_url",
    description=(
        "Fetch and read the text content of a specific URL. Use after web_search when you "
        "need the full article, or when the user pastes a URL. Requires web search enabled."
    ),
    parameters_schema={
        "type": "object",
        "properties": {
            "url": {"type": "string"},
            "extract_tables": {"type": "boolean", "default": False},
        },
        "required": ["url"],
    },
)

_INTERNET_SPECS = (WEB_SEARCH_SPEC, FETCH_URL_SPEC)
_INTERNET_HANDLERS = {
    "web_search": web_search,
    "fetch_url": fetch_url,
}


def register_internet_tools(registry: ToolRegistry) -> None:
    """Register web_search and fetch_url on a product tool registry."""
    for spec in _INTERNET_SPECS:
        if not registry.has_tool(spec.name):
            registry.register(spec, _INTERNET_HANDLERS[spec.name])


def _has_pdf_attachment(attachments: list[Any] | None) -> bool:
    for att in attachments or []:
        mt = ""
        if isinstance(att, dict):
            mt = str(att.get("media_type") or att.get("mime_type") or "")
        else:
            mt = str(getattr(att, "media_type", None) or "")
        if mt.lower().startswith("application/pdf"):
            return True
    return False


def resolve_session_capabilities(
    *,
    request_context: dict[str, Any] | None,
    web_search_enabled: bool | None = None,
    url_fetch_enabled: bool | None = None,
    debug_mode: bool | None = None,
    attachments: list[Any] | None = None,
    flags: CapabilityFlags | None = None,
) -> SessionCapabilities:
    """Merge per-request flags, UI context, and global env kill switches."""
    flags = flags or load_capability_flags()
    ctx = dict(request_context or {})

    def _ctx_bool(key: str) -> bool | None:
        if key in ctx:
            return bool(ctx[key])
        caps = ctx.get("session_capabilities") or ctx.get("capabilities")
        if isinstance(caps, dict) and key in caps:
            return bool(caps[key])
        return None

    ws = web_search_enabled if web_search_enabled is not None else _ctx_bool("web_search_enabled")
    uf = url_fetch_enabled if url_fetch_enabled is not None else _ctx_bool("url_fetch_enabled")
    dbg = debug_mode if debug_mode is not None else _ctx_bool("debug_mode")

    tenant_raw = ctx.get("tenant_agent_capabilities")
    if isinstance(tenant_raw, dict) and tenant_raw:
        tenant_caps = TenantAgentCapabilities.model_validate(tenant_raw)
    else:
        tenant_caps = parse_tenant_agent_capabilities(ctx.get("tenant_ai_settings"))

    if not tenant_caps.web_search_allowed:
        ws = False
    elif ws is None:
        ws = tenant_caps.web_search_default

    if not tenant_caps.url_fetch_allowed:
        uf = False

    ws_enabled = bool(ws) and flags.web_search
    uf_enabled = bool(uf if uf is not None else ws_enabled) and flags.url_fetch and ws_enabled

    pdf_allowed = tenant_caps.pdf_parse_allowed and flags.pdf_parse
    vision_allowed = tenant_caps.image_vision_allowed and flags.image_vision
    debug_allowed = tenant_caps.debug_mode_allowed and flags.debug_mode

    pdf_ctx = _ctx_bool("pdf_parse_enabled")
    pdf_enabled = bool(pdf_ctx) if pdf_ctx is not None else _has_pdf_attachment(attachments)

    return SessionCapabilities(
        web_search_enabled=ws_enabled,
        url_fetch_enabled=uf_enabled,
        debug_mode=bool(dbg) and debug_allowed,
        image_vision_enabled=bool(_ctx_bool("image_vision_enabled")) and vision_allowed,
        pdf_parse_enabled=pdf_enabled and pdf_allowed,
    )


def filter_tool_specs_for_session(
    specs: list[ToolSpec],
    caps: SessionCapabilities,
) -> list[ToolSpec]:
    """Drop internet tools when session capabilities disable them."""
    out: list[ToolSpec] = []
    for spec in specs:
        if spec.name == "web_search" and not caps.web_search_enabled:
            continue
        if spec.name == "fetch_url" and not caps.url_fetch_enabled:
            continue
        out.append(spec)
    return out


def internet_tools_in_names(tool_names: list[str] | None) -> list[str]:
    """Append internet tool names when registry should expose them (filtered at runtime)."""
    names = list(tool_names or [])
    for n in INTERNET_TOOL_NAMES:
        if n not in names:
            names.append(n)
    return names
