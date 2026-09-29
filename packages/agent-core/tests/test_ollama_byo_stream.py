"""OllamaClient BYO path must stream tokens, not return one blocking chunk."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from agent_core.ollama_client import OllamaClient


@pytest.mark.asyncio
async def test_ollama_client_byo_stream_yields_multiple_tokens() -> None:
    client = OllamaClient(base_url="http://127.0.0.1:11434")
    fake_resolved = type("Resolved", (), {"is_byo": True, "model": "gpt-4o-mini"})()

    async def _fake_stream(*_a, **_k):
        for part in ("Hi", " ", "there"):
            yield part

    with patch.object(client, "resolve_installed_model", return_value="gpt-4o-mini"), patch(
        "ai_providers.byo_chat.stream_chat", _fake_stream
    ):
        client.resolved = fake_resolved
        chunks = [
            t
            async for t in client.stream_chat(
                system="sys",
                prompt="hello",
                model="gpt-4o-mini",
            )
        ]
    assert chunks == ["Hi", " ", "there"]
