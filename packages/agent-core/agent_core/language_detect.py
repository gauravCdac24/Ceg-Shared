"""Lightweight language detection for agent routing and logging."""

from __future__ import annotations

_INDIC_LANGS = frozenset({"hi", "mr", "gu", "pa"})


def detect_language(text: str) -> str | None:
    """Return ISO 639-1 code or None when detection is unavailable."""
    snippet = (text or "").strip()
    if len(snippet) < 8:
        return None
    try:
        from langdetect import detect

        lang = (detect(snippet) or "").strip().lower()
        return lang or None
    except Exception:
        return None


def is_indic_language(lang: str | None) -> bool:
    return bool(lang and lang.lower() in _INDIC_LANGS)
