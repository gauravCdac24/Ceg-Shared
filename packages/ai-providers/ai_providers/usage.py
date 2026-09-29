"""Token / usage extraction from provider responses (no pricing tables)."""

from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class TokenUsage:
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None

    @property
    def has_any(self) -> bool:
        return any(v is not None for v in (self.prompt_tokens, self.completion_tokens, self.total_tokens))


_usage_ctx: ContextVar[TokenUsage | None] = ContextVar("ai_providers_token_usage", default=None)


def get_last_token_usage() -> TokenUsage | None:
    """Return usage for the current async task (contextvar), not a global."""
    return _usage_ctx.get()


def set_last_token_usage(usage: TokenUsage) -> None:
    _usage_ctx.set(usage)


def estimate_tokens(text: str) -> int:
    """Cheap heuristic when provider usage is absent (~4 chars/token)."""
    return max(0, len(text or "") // 4)


def from_ollama_generate(body: dict[str, Any] | None) -> TokenUsage:
    if not body:
        return TokenUsage()
    prompt = body.get("prompt_eval_count")
    completion = body.get("eval_count")
    p = int(prompt) if isinstance(prompt, (int, float)) else None
    c = int(completion) if isinstance(completion, (int, float)) else None
    total = (p or 0) + (c or 0) if p is not None or c is not None else None
    return TokenUsage(prompt_tokens=p, completion_tokens=c, total_tokens=total or None)


def from_openai_compat(body: dict[str, Any] | None) -> TokenUsage:
    if not body:
        return TokenUsage()
    usage = body.get("usage") or {}
    if not isinstance(usage, dict):
        return TokenUsage()
    p = usage.get("prompt_tokens")
    c = usage.get("completion_tokens")
    t = usage.get("total_tokens")
    return TokenUsage(
        prompt_tokens=int(p) if isinstance(p, (int, float)) else None,
        completion_tokens=int(c) if isinstance(c, (int, float)) else None,
        total_tokens=int(t) if isinstance(t, (int, float)) else None,
    )


def from_anthropic(body: dict[str, Any] | None) -> TokenUsage:
    if not body:
        return TokenUsage()
    usage = body.get("usage") or {}
    if not isinstance(usage, dict):
        return TokenUsage()
    p = usage.get("input_tokens")
    c = usage.get("output_tokens")
    pi = int(p) if isinstance(p, (int, float)) else None
    co = int(c) if isinstance(c, (int, float)) else None
    total = (pi or 0) + (co or 0) if pi is not None or co is not None else None
    return TokenUsage(prompt_tokens=pi, completion_tokens=co, total_tokens=total or None)
