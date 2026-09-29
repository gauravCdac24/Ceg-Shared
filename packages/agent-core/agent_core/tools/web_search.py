"""Internet search tool — DuckDuckGo (OSS default) with optional Tavily."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus, urlparse

import httpx
import structlog

from agent_core.capability_flags import load_capability_flags
from agent_core.tools.bhashini_bridge import detect_hindi_query, hindi_query_to_english, translate_text

log = structlog.get_logger(__name__)

_UNTRUSTED_LABEL = "UNTRUSTED_WEB"

_DDG_HTML = "https://html.duckduckgo.com/html/"
_TAVILY_API = "https://api.tavily.com/search"


def _session_web_search_enabled(context: dict[str, Any] | None) -> bool:
    ctx = context or {}
    caps = ctx.get("session_capabilities") or ctx.get("capabilities") or {}
    if isinstance(caps, dict):
        return bool(caps.get("web_search_enabled"))
    return bool(ctx.get("web_search_enabled"))


def _record_search_audit(context: dict[str, Any] | None, query: str) -> None:
    ctx = context or {}
    bucket = ctx.setdefault("_internet_audit", {})
    queries = bucket.setdefault("search_queries", [])
    if query and query not in queries:
        queries.append(query[:500])


def _wrap_untrusted(payload: dict[str, Any]) -> str:
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    return (
        f"--- BEGIN TOOL RESULT ({_UNTRUSTED_LABEL}) ---\n"
        f"{body}\n"
        f"--- END TOOL RESULT ({_UNTRUSTED_LABEL}) ---"
    )


async def _search_ddg(query: str, *, max_results: int, blocked: tuple[str, ...]) -> list[dict[str, str]]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; CeG-Agent/1.0; +https://ceg.gov.in) "
            "AppleWebKit/537.36"
        ),
        "Accept": "text/html",
    }
    async with httpx.AsyncClient(follow_redirects=True, timeout=20.0, headers=headers) as client:
        resp = await client.post(_DDG_HTML, data={"q": query, "b": "", "kl": "wt-wt"})
        resp.raise_for_status()
        html = resp.text

    results: list[dict[str, str]] = []
    for match in re.finditer(
        r'class="result__a"[^>]*href="(?P<url>[^"]+)"[^>]*>(?P<title>.*?)</a>',
        html,
        re.IGNORECASE | re.DOTALL,
    ):
        url = match.group("url")
        if url.startswith("//"):
            url = "https:" + url
        if is_blocked_domain(url, blocked):
            continue
        ok, _ = validate_outbound_url(url)
        if not ok:
            continue
        title = re.sub(r"<[^>]+>", "", match.group("title")).strip()
        snippet = ""
        results.append({"title": title, "url": url, "snippet": snippet})
        if len(results) >= max_results:
            break

    if not results:
        for match in re.finditer(
            r'class="result__snippet"[^>]*>(?P<snippet>.*?)</(?:a|td|div)>',
            html,
            re.IGNORECASE | re.DOTALL,
        ):
            snippet = re.sub(r"<[^>]+>", "", match.group("snippet")).strip()
            if snippet:
                results.append({"title": query, "url": "", "snippet": snippet})
                if len(results) >= max_results:
                    break
    return results[:max_results]


async def _search_tavily(query: str, *, max_results: int, blocked: tuple[str, ...]) -> list[dict[str, str]]:
    api_key = (os.environ.get("TAVILY_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("TAVILY_API_KEY not configured")
    payload = {
        "api_key": api_key,
        "query": query,
        "max_results": max_results,
        "include_answer": False,
        "search_depth": "basic",
    }
    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.post(_TAVILY_API, json=payload)
        resp.raise_for_status()
        data = resp.json()
    out: list[dict[str, str]] = []
    for item in data.get("results") or []:
        url = str(item.get("url") or "")
        if url and is_blocked_domain(url, blocked):
            continue
        out.append(
            {
                "title": str(item.get("title") or ""),
                "url": url,
                "snippet": str(item.get("content") or "")[:800],
            }
        )
    return out[:max_results]


async def web_search(
    query: str = "",
    max_results: int | None = None,
    *,
    _context: dict[str, Any] | None = None,
) -> str:
    flags = load_capability_flags()
    if not flags.web_search:
        return json.dumps({"error": True, "message": "Web search is disabled platform-wide."})
    if not _session_web_search_enabled(_context):
        return json.dumps(
            {
                "error": True,
                "message": "Web search is off for this chat. Enable the globe toggle in the composer.",
            }
        )

    cleaned = (query or "").strip()
    if not cleaned:
        return json.dumps({"error": True, "message": "query is required"})
    if len(cleaned) > 500:
        cleaned = cleaned[:500]

    limit = max_results if max_results is not None else flags.web_search_max_results
    limit = max(1, min(10, int(limit)))

    _record_search_audit(_context, cleaned)
    search_query = cleaned
    original_query = cleaned
    if detect_hindi_query(cleaned):
        search_query, original_query = await hindi_query_to_english(cleaned)

    log.info(
        "agent_web_search",
        query=search_query[:120],
        original_query=original_query[:120] if original_query != search_query else None,
        provider=flags.web_search_provider,
        tenant_id=(_context or {}).get("tenant_id"),
    )

    try:
        if flags.web_search_provider == "tavily":
            results = await _search_tavily(search_query, max_results=limit, blocked=flags.blocked_domains)
        else:
            results = await _search_ddg(search_query, max_results=limit, blocked=flags.blocked_domains)
    except Exception as exc:
        log.warning("agent_web_search_failed", error=str(exc))
        return json.dumps({"error": True, "message": f"Search failed: {exc}"})

    if original_query != search_query and results:
        try:
            for item in results:
                snippet = item.get("snippet") or ""
                title = item.get("title") or ""
                if snippet:
                    item["snippet"] = await translate_text(snippet, "en", "hi")
                if title:
                    item["title"] = await translate_text(title, "en", "hi")
        except Exception:
            pass

    accessed = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "query": cleaned,
        "search_query": search_query,
        "provider": flags.web_search_provider,
        "accessed_at": accessed,
        "result_count": len(results),
        "results": results,
        "citation_hint": "Always cite source URL and accessed_at when using these results.",
    }
    if not results:
        payload["message"] = "No useful results returned. Do not invent sources."
    return _wrap_untrusted(payload)
