"""Global agent capability flags from environment (tenant overrides via request context)."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _env_bool(key: str, default: bool = False) -> bool:
    raw = os.environ.get(key)
    if raw is None:
        return default
    return str(raw).strip().lower() not in ("0", "false", "no", "off")


@dataclass(frozen=True)
class CapabilityFlags:
    web_search: bool
    url_fetch: bool
    image_vision: bool
    pdf_parse: bool
    subagent_spawn: bool
    plan_mode: bool
    debug_mode: bool
    web_search_provider: str
    web_search_max_results: int
    blocked_domains: tuple[str, ...]


def load_capability_flags() -> CapabilityFlags:
    blocked_raw = os.environ.get("WEB_SEARCH_BLOCKED_DOMAINS", "")
    blocked = tuple(d.strip().lower() for d in blocked_raw.split(",") if d.strip())
    if not blocked:
        blocked = (
            "facebook.com",
            "twitter.com",
            "x.com",
            "reddit.com",
            "pastebin.com",
            "tiktok.com",
        )
    max_results = 5
    try:
        max_results = max(1, min(10, int(os.environ.get("WEB_SEARCH_MAX_RESULTS", "5"))))
    except ValueError:
        pass
    provider = (os.environ.get("WEB_SEARCH_PROVIDER") or "ddg").strip().lower()
    if provider not in ("ddg", "tavily", "serpapi"):
        provider = "ddg"
    return CapabilityFlags(
        web_search=_env_bool("AGENT_WEB_SEARCH_ENABLED", default=True),
        url_fetch=_env_bool("AGENT_URL_FETCH_ENABLED", default=True),
        image_vision=_env_bool("AGENT_IMAGE_VISION_ENABLED", default=False),
        pdf_parse=_env_bool("AGENT_PDF_PARSE_ENABLED", default=False),
        subagent_spawn=_env_bool("AGENT_SUBAGENT_SPAWN_ENABLED", default=True),
        plan_mode=_env_bool("AGENT_PLAN_MODE_ENABLED", default=True),
        debug_mode=_env_bool("AGENT_DEBUG_MODE_ENABLED", default=True),
        web_search_provider=provider,
        web_search_max_results=max_results,
        blocked_domains=blocked,
    )


INTERNET_TOOL_NAMES = frozenset({"web_search", "fetch_url"})
