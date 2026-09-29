"""Fetch and extract text from a public URL (SSRF-hardened)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import httpx
import structlog

from agent_core.capability_flags import load_capability_flags
from agent_core.tools.url_safety import (
    is_blocked_domain,
    normalize_url,
    strip_html_to_text,
    validate_outbound_url,
)

log = structlog.get_logger(__name__)

_UNTRUSTED_LABEL = "UNTRUSTED_WEB"
_MAX_BYTES = 512_000
_MAX_REDIRECTS = 5


def _session_url_fetch_enabled(context: dict[str, Any] | None) -> bool:
    ctx = context or {}
    caps = ctx.get("session_capabilities") or ctx.get("capabilities") or {}
    if isinstance(caps, dict):
        enabled = caps.get("url_fetch_enabled")
        if enabled is not None:
            return bool(enabled)
    if ctx.get("url_fetch_enabled") is not None:
        return bool(ctx.get("url_fetch_enabled"))
    # URL fetch requires web search to be enabled for this session (egress bundle).
    return _session_web_search_enabled(ctx)


def _session_web_search_enabled(context: dict[str, Any]) -> bool:
    caps = context.get("session_capabilities") or context.get("capabilities") or {}
    if isinstance(caps, dict) and caps.get("web_search_enabled") is not None:
        return bool(caps.get("web_search_enabled"))
    return bool(context.get("web_search_enabled"))


def _record_url_audit(context: dict[str, Any] | None, url: str) -> None:
    ctx = context or {}
    bucket = ctx.setdefault("_internet_audit", {})
    urls = bucket.setdefault("external_urls_fetched", [])
    if url and url not in urls:
        urls.append(url[:2000])


def _wrap_untrusted(payload: dict[str, Any]) -> str:
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    return (
        f"--- BEGIN TOOL RESULT ({_UNTRUSTED_LABEL}) ---\n"
        f"{body}\n"
        f"--- END TOOL RESULT ({_UNTRUSTED_LABEL}) ---"
    )


async def fetch_url(
    url: str = "",
    extract_tables: bool = False,
    *,
    _context: dict[str, Any] | None = None,
) -> str:
    del extract_tables  # reserved for phase 2 table extraction
    flags = load_capability_flags()
    if not flags.url_fetch:
        return json.dumps({"error": True, "message": "URL fetch is disabled platform-wide."})
    if not _session_url_fetch_enabled(_context):
        return json.dumps(
            {
                "error": True,
                "message": "URL fetch requires web search enabled for this chat session.",
            }
        )

    target = normalize_url(url or "")
    if not target:
        return json.dumps({"error": True, "message": "url is required"})

    if is_blocked_domain(target, flags.blocked_domains):
        return json.dumps({"error": True, "message": "url domain is blocked"})

    ok, reason = validate_outbound_url(target)
    if not ok:
        return json.dumps({"error": True, "message": f"url_blocked:{reason}"})

    _record_url_audit(_context, target)
    log.info(
        "agent_fetch_url",
        url=target[:200],
        tenant_id=(_context or {}).get("tenant_id"),
    )

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; CeG-Agent/1.0) AppleWebKit/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    }
    try:
        async with httpx.AsyncClient(
            follow_redirects=False,
            timeout=25.0,
            headers=headers,
        ) as client:
            current_url = target
            redirect_count = 0
            while True:
                resp = await client.get(current_url)
                if resp.status_code in {301, 302, 303, 307, 308}:
                    if redirect_count >= _MAX_REDIRECTS:
                        return json.dumps({"error": True, "message": "too_many_redirects"})
                    location = (resp.headers.get("location") or "").strip()
                    if not location:
                        return json.dumps({"error": True, "message": "invalid_redirect"})
                    next_url = str(httpx.URL(current_url).join(location))
                    if is_blocked_domain(next_url, flags.blocked_domains):
                        return json.dumps({"error": True, "message": "url domain is blocked"})
                    ok, reason = validate_outbound_url(next_url)
                    if not ok:
                        return json.dumps({"error": True, "message": f"url_blocked:{reason}"})
                    _record_url_audit(_context, next_url)
                    current_url = next_url
                    redirect_count += 1
                    continue
                break

            resp.raise_for_status()
            if len(resp.content) > _MAX_BYTES:
                return json.dumps({"error": True, "message": "response_too_large"})
            content_type = (resp.headers.get("content-type") or "").lower()
            if "html" in content_type or "text/" in content_type or not content_type:
                text = strip_html_to_text(resp.text)
            else:
                return json.dumps({"error": True, "message": "unsupported_content_type"})
    except Exception as exc:
        log.warning("agent_fetch_url_failed", error=str(exc))
        return json.dumps({"error": True, "message": f"Fetch failed: {exc}"})

    accessed = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "url": str(resp.request.url) if getattr(resp, "request", None) else target,
        "accessed_at": accessed,
        "text": text,
        "citation_hint": "Cite this URL and accessed_at in your answer.",
    }
    return _wrap_untrusted(payload)
