"""Lightweight output moderation heuristics (no ML dependency).

Blocks high-confidence toxicity / violence / hate markers before they reach
users. Not a substitute for a dedicated classifier — use as a first line.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_TOXICITY_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"\b(kill\s+yourself|kys)\b",
        r"\b(rape|molest)\b",
        r"\b(ethnic\s+cleansing|genocide\s+of)\b",
        r"\b(nigg(?:er|a)|faggot|tranny)\b",
        r"\b(bomb\s+making|how\s+to\s+make\s+a\s+bomb)\b",
        r"\b(child\s+porn|csam)\b",
    )
)

_PLACEHOLDER = "[content removed by safety filter]"


@dataclass(frozen=True)
class ModerationResult:
    allowed: bool
    score: float
    reason: str | None = None
    sanitized: str = ""


def score_toxicity(text: str) -> float:
    # Sprint-4 #41: normalize before heuristic scan (homoglyph / NFKC bypass).
    try:
        from agent_core.guardrails import normalize_input

        cleaned = normalize_input(text or "").strip()
    except Exception:  # noqa: BLE001
        cleaned = (text or "").strip()
    if not cleaned:
        return 0.0
    hits = sum(1 for p in _TOXICITY_PATTERNS if p.search(cleaned))
    if hits == 0:
        return 0.0
    return min(1.0, 0.55 + 0.2 * (hits - 1))


def moderate_output(text: str, *, block_threshold: float = 0.55) -> ModerationResult:
    score = score_toxicity(text)
    if score >= block_threshold:
        return ModerationResult(
            allowed=False,
            score=score,
            reason="toxicity",
            sanitized=_PLACEHOLDER,
        )
    return ModerationResult(allowed=True, score=score, sanitized=text or "")
