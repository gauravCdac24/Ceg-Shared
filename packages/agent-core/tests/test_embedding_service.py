"""Tests for Ollama embedding client."""

from __future__ import annotations

import pytest
import respx
from httpx import Response

from agent_core.embedding_service import embed_text


@pytest.mark.asyncio
@respx.mock
async def test_embed_text_returns_vector():
    respx.post("http://127.0.0.1:11435/api/embeddings").mock(
        return_value=Response(200, json={"embedding": [0.1, 0.2, 0.3]})
    )
    vec = await embed_text("hello world", base_url="http://127.0.0.1:11435")
    assert vec == [0.1, 0.2, 0.3]


@pytest.mark.asyncio
async def test_embed_text_empty_returns_none():
    assert await embed_text("") is None
