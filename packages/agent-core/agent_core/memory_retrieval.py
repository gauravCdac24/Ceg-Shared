"""Semantic memory ranking, decay, deduplication (pgvector optional)."""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

import structlog

log = structlog.get_logger(__name__)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def rank_memories(
    candidates: list[dict[str, Any]],
    *,
    query_embedding: list[float] | None = None,
    decay_half_life_days: float = 30.0,
    now: datetime | None = None,
) -> list[dict[str, str]]:
    """Rank and deduplicate memory facts by semantic score + recency decay."""
    if not candidates:
        return []
    now = now or datetime.now(timezone.utc)
    scored: list[tuple[float, dict[str, str]]] = []
    seen_values: set[str] = set()

    for item in candidates:
        value = str(item.get("value") or item.get("content") or "").strip()
        if not value or value in seen_values:
            continue
        seen_values.add(value)
        key = str(item.get("key") or "")
        text_score = float(item.get("text_score") or 0.5)
        embedding = item.get("embedding")
        vector: list[float] | None = None
        if isinstance(embedding, dict):
            vector = embedding.get("vector")
        elif isinstance(embedding, list):
            vector = embedding
        semantic = cosine_similarity(query_embedding, vector) if query_embedding and vector else text_score

        created = item.get("created_at")
        age_days = 0.0
        if isinstance(created, datetime):
            age_days = max(0.0, (now - created.replace(tzinfo=timezone.utc)).total_seconds() / 86400)
        decay = 0.5 ** (age_days / max(decay_half_life_days, 1.0))
        score = semantic * 0.75 + decay * 0.25
        scored.append((score, {"key": key, "value": value}))

    scored.sort(key=lambda row: row[0], reverse=True)
    return [row[1] for row in scored]


def dedupe_facts(facts: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for fact in facts:
        val = (fact.get("value") or "").strip().lower()
        if not val or val in seen:
            continue
        seen.add(val)
        out.append(fact)
    return out
