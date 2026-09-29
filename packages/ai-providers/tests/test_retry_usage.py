"""Tests for provider retry + usage helpers."""

from __future__ import annotations

import pytest

from ai_providers.retry import is_retryable_status, with_retries
from ai_providers.usage import TokenUsage, estimate_tokens, from_ollama_generate, from_openai_compat


def test_estimate_tokens():
    assert estimate_tokens("abcd") == 1
    assert estimate_tokens("") == 0


def test_from_ollama_generate():
    u = from_ollama_generate({"prompt_eval_count": 12, "eval_count": 34, "response": "hi"})
    assert u == TokenUsage(prompt_tokens=12, completion_tokens=34, total_tokens=46)


def test_from_openai_compat():
    u = from_openai_compat({"usage": {"prompt_tokens": 1, "completion_tokens": 2, "total_tokens": 3}})
    assert u.total_tokens == 3


def test_retryable_status():
    assert is_retryable_status(429)
    assert is_retryable_status(503)
    assert not is_retryable_status(400)


@pytest.mark.asyncio
async def test_usage_contextvar_is_task_local():
    from ai_providers.usage import TokenUsage, get_last_token_usage, set_last_token_usage

    set_last_token_usage(TokenUsage(prompt_tokens=1, completion_tokens=2, total_tokens=3))
    assert get_last_token_usage() is not None
    assert get_last_token_usage().total_tokens == 3
