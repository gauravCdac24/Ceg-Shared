"""Lightweight citation compliance checks for gov/education agent responses."""

from __future__ import annotations

import re
from typing import Any

_URL_RE = re.compile(r"https?://[^\s\])>\"']+", re.I)
_DATE_RE = re.compile(
    r"\b(20\d{2}[-/]\d{2}[-/]\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+20\d{2})\b",
    re.I,
)


def score_citation_compliance(
    response: str,
    *,
    used_web_search: bool = False,
    min_urls_when_search: int = 1,
) -> dict[str, Any]:
    """
    Heuristic eval for NEP/policy answers — not LLM-judged.
    Returns pass/fail + reasons for test harness and admin dashboards.
    """
    text = (response or "").strip()
    urls = _URL_RE.findall(text)
    has_date = bool(_DATE_RE.search(text))
    reasons: list[str] = []

    if used_web_search:
        if len(urls) < min_urls_when_search:
            reasons.append("web_search_used_but_no_url_cited")
        if not has_date:
            reasons.append("web_search_used_but_no_access_date")
    if used_web_search and ("http://" in text.lower() or "https://" in text.lower()):
        if "untrusted" not in text.lower() and "source" not in text.lower():
            reasons.append("missing_explicit_source_label")

    passed = len(reasons) == 0
    return {
        "passed": passed,
        "reasons": reasons,
        "url_count": len(urls),
        "has_access_date": has_date,
        "used_web_search": used_web_search,
    }
