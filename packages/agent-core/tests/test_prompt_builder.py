from __future__ import annotations

from agent_core.prompt_builder import truncate_to_token_budget


def test_truncate_to_token_budget_preserves_system_message() -> None:
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "a" * 400},
        {"role": "assistant", "content": "b" * 400},
        {"role": "user", "content": "c" * 400},
    ]

    trimmed = truncate_to_token_budget(messages, budget=50)

    assert trimmed[0]["role"] == "system"
    assert trimmed[0]["content"] == "You are a helpful assistant."
    assert len(trimmed) < len(messages)
    assert sum(len(m["content"]) // 4 for m in trimmed) <= 50
