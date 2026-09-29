"""Helpers for turning thumbs-down feedback into retrievable procedural memory."""

from __future__ import annotations

NEGATIVE_FEEDBACK_KEY_PREFIX = "negative_feedback:"
MAX_NEGATIVE_FEEDBACK_HINTS = 3


def negative_feedback_key(intent: str) -> str:
    safe = (intent or "unknown").strip().lower().replace(" ", "_")[:64]
    return f"{NEGATIVE_FEEDBACK_KEY_PREFIX}{safe}"


def format_negative_feedback_value(
    *,
    comment: str | None,
    tools: list[str] | None,
    message_excerpt: str | None,
) -> str:
    parts: list[str] = ["User disliked this assistant response."]
    if tools:
        parts.append(f"Tools involved: {', '.join(tools[:5])}.")
    if comment and comment.strip():
        parts.append(f"User comment: {comment.strip()[:500]}")
    elif message_excerpt:
        parts.append(f"Response excerpt: {message_excerpt.strip()[:240]}")
    parts.append("Avoid repeating this pattern for the same intent.")
    return " ".join(parts)
