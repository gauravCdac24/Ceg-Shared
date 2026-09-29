"""Citation-required gate for org_knowledge RAG hits (Sprint-8 #21).

When org_knowledge chunks are present and AGENT_CITATION_REQUIRED is on
(default True for Cert Studio org_knowledge), the model reply must include
inline markers like [1] / [source:…] referencing retrieved chunks. One retry
with an explicit cite instruction is allowed.
"""

from __future__ import annotations

import os
import re
from typing import Any

_CITE_MARKER_RE = re.compile(
    r"\[\s*\d+\s*\]|\[source:[^\]]+\]|\(source:\s*[^)]+\)",
    re.I,
)
_FACTUAL_CLAIM_RE = re.compile(
    r"\b(is|are|was|were|has|have|according to|policy|requires|mandates|states that)\b",
    re.I,
)

CITE_RETRY_INSTRUCTION = (
    "Your previous answer used organization knowledge but lacked inline citations. "
    "Rewrite and include markers like [1] or [source:title] for every factual claim "
    "drawn from the retrieved org_knowledge snippets. Do not invent sources."
)


def citation_required_enabled(*, product: str = "", context: dict[str, Any] | None = None) -> bool:
    """Default ON when context marks org_knowledge hits (Cert Studio)."""
    raw = (os.getenv("AGENT_CITATION_REQUIRED") or "").strip().lower()
    if raw in {"0", "false", "no", "off"}:
        return False
    if raw in {"1", "true", "yes", "on"}:
        return True
    ctx = context or {}
    hits = ctx.get("org_knowledge_hits") or ctx.get("org_knowledge_count") or 0
    try:
        n = int(hits) if not isinstance(hits, list) else len(hits)
    except (TypeError, ValueError):
        n = 0
    if n <= 0:
        return False
    # Default ON for cert_studio org_knowledge queries only.
    prod = (product or str(ctx.get("product") or "")).lower()
    return prod in {"cert_studio", "certstudio", ""}


def has_citation_markers(text: str) -> bool:
    return bool(_CITE_MARKER_RE.search(text or ""))


def needs_citation_retry(text: str, *, hit_count: int) -> bool:
    if hit_count <= 0:
        return False
    body = (text or "").strip()
    if not body:
        return False
    if has_citation_markers(body):
        return False
    # Only flag when the reply looks like it asserts facts.
    return bool(_FACTUAL_CLAIM_RE.search(body))


def score_org_citation(response: str, *, hit_count: int) -> dict[str, Any]:
    cited = has_citation_markers(response)
    needs = needs_citation_retry(response, hit_count=hit_count)
    return {
        "passed": hit_count <= 0 or cited or not needs,
        "cited": cited,
        "needs_retry": needs,
        "hit_count": hit_count,
    }
