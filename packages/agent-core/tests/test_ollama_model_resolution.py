from __future__ import annotations

import pytest

from agent_core.ollama_client import OllamaClient


@pytest.mark.asyncio
async def test_resolve_installed_model_falls_back_to_base_tag(monkeypatch):
    client = OllamaClient(base_url="http://127.0.0.1:11434")

    async def fake_list():
        return ["llama3.2:latest"]

    monkeypatch.setattr(client, "list_models", fake_list)
    resolved = await client.resolve_installed_model("llama3.2:3b")
    assert resolved == "llama3.2:latest"
