from __future__ import annotations

import pytest

from agent_core.ollama_client import _inject_ollama_runtime
from agent_core.schemas import TaskKind


def test_inject_num_ctx_and_keep_alive_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OLLAMA_NUM_CTX", "2048")
    monkeypatch.setenv("OLLAMA_KEEP_ALIVE", "0")

    payload = _inject_ollama_runtime({"model": "qwen2.5:7b"}, task_kind=TaskKind.agent_loop)

    assert payload["options"]["num_ctx"] == 2048
    assert payload["keep_alive"] == 0


def test_inject_keep_alive_duration_string(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OLLAMA_KEEP_ALIVE", "30m")

    payload = _inject_ollama_runtime({"model": "qwen2.5:7b"}, task_kind=TaskKind.agent_loop)

    assert payload["keep_alive"] == "30m"


def test_inject_fast_task_uses_fast_ctx(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OLLAMA_NUM_CTX", "2048")
    monkeypatch.setenv("OLLAMA_NUM_CTX_FAST", "1024")

    payload = _inject_ollama_runtime({"model": "qwen2.5:7b"}, task_kind=TaskKind.chat_fast)

    assert payload["options"]["num_ctx"] == 1024


def test_inject_respects_explicit_options_override(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OLLAMA_NUM_CTX", "2048")

    payload = _inject_ollama_runtime(
        {"model": "qwen2.5:7b"},
        task_kind=TaskKind.agent_loop,
        options={"num_ctx": 4096},
        keep_alive=120,
    )

    assert payload["options"]["num_ctx"] == 4096
    assert payload["keep_alive"] == 120
