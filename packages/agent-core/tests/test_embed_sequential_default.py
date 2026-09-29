"""Sprint-8 embed sequential profile default."""

import os

from agent_core.env_resolver import OLLAMA_EMBED_SEQUENTIAL, resolve_bool_env


def test_embed_sequential_defaults_true_on_tiny(monkeypatch):
    monkeypatch.setenv("OLLAMA_VM_PROFILE", "tiny")
    monkeypatch.delenv(OLLAMA_EMBED_SEQUENTIAL, raising=False)
    # Clear any cached env reads — resolve reads os each call.
    assert resolve_bool_env(OLLAMA_EMBED_SEQUENTIAL) is True


def test_embed_sequential_defaults_false_on_standard(monkeypatch):
    monkeypatch.setenv("OLLAMA_VM_PROFILE", "standard")
    monkeypatch.delenv(OLLAMA_EMBED_SEQUENTIAL, raising=False)
    assert resolve_bool_env(OLLAMA_EMBED_SEQUENTIAL) is False
