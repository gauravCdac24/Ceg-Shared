from __future__ import annotations

import pytest

from agent_core.model_router import ModelRouter, ModelConfig, TaskType, route_model
from agent_core.schemas import TaskKind


# ── Existing ModelRouter tests (kept) ─────────────────────────────────────────

def test_each_task_kind_maps_differently():
    router = ModelRouter(
        platform_default="agent-model",
        platform_fast="fast-model",
        platform_json="json-model",
        platform_embedding="embed-model",
    )
    agent = router.route(TaskKind.agent_loop)
    fast = router.route(TaskKind.chat_fast)
    json_route = router.route(TaskKind.json_extract)
    embed = router.route(TaskKind.embedding)

    assert agent.model == "agent-model"
    assert fast.model == "fast-model"
    assert json_route.model == "json-model"
    assert json_route.use_json_mode is True
    assert embed.model == "embed-model"


def test_product_override():
    router = ModelRouter(
        platform_default="default",
        platform_fast="fast",
        platform_json="json",
        product_overrides={TaskKind.planning: "planner-x"},
    )
    assert router.route(TaskKind.planning).model == "planner-x"


# ── Sprint 4: route_model() function tests ────────────────────────────────────

def test_route_simple_chat_returns_cheap_model():
    config = route_model(TaskType.SIMPLE_CHAT)
    assert config.provider == "ollama"
    assert config.model_name  # not empty


def test_route_planning_returns_capable_model(monkeypatch):
    monkeypatch.setenv("OLLAMA_CAPABLE_MODEL", "qwen2.5:14b")
    monkeypatch.delenv("AGENT_OLLAMA_BASE_URL", raising=False)
    config = route_model(TaskType.PLANNING)
    assert config.provider == "ollama"
    assert config.model_name == "qwen2.5:14b"
    assert config.max_tokens >= 4096


def test_route_embedding_returns_embedding_model():
    config = route_model(TaskType.EMBEDDING)
    assert config.provider == "ollama"
    assert config.temperature == 0.0
    assert config.max_tokens == 0


def test_route_vision_returns_vision_model(monkeypatch):
    monkeypatch.setenv("OLLAMA_VISION_MODEL", "llava:13b")
    config = route_model(TaskType.VISION)
    assert config.provider == "ollama"
    assert config.model_name == "llava:13b"


def test_route_byo_provider_used_for_planning():
    tenant_config = {"ai_provider": "openai", "ai_model": "gpt-4o"}
    config = route_model(TaskType.PLANNING, tenant_config=tenant_config)
    assert config.provider == "openai"
    assert config.model_name == "gpt-4o"
    assert config.base_url is None


def test_route_byo_not_used_for_simple_chat():
    # BYO only kicks in for planning/vision — simple chat stays local
    tenant_config = {"ai_provider": "openai", "ai_model": "gpt-4o"}
    config = route_model(TaskType.SIMPLE_CHAT, tenant_config=tenant_config)
    assert config.provider == "ollama"  # stays local for cheap tasks


def test_route_byo_used_for_vision():
    tenant_config = {"ai_provider": "anthropic", "ai_model": "claude-3-5-sonnet-20241022"}
    config = route_model(TaskType.VISION, tenant_config=tenant_config)
    assert config.provider == "anthropic"


def test_route_code_or_json_uses_capable_model(monkeypatch):
    monkeypatch.setenv("OLLAMA_CAPABLE_MODEL", "qwen2.5-coder:14b")
    config = route_model(TaskType.CODE_OR_JSON)
    assert config.provider == "ollama"
    assert config.model_name == "qwen2.5-coder:14b"


def test_route_translation_uses_cheap_model(monkeypatch):
    monkeypatch.setenv("OLLAMA_CHEAP_MODEL", "qwen2.5:7b")
    config = route_model(TaskType.TRANSLATION)
    assert config.provider == "ollama"
    assert config.model_name == "qwen2.5:7b"


def test_route_model_config_type():
    config = route_model(TaskType.SIMPLE_CHAT)
    assert isinstance(config, ModelConfig)
    assert isinstance(config.provider, str)
    assert isinstance(config.model_name, str)
    assert isinstance(config.max_tokens, int)
    assert isinstance(config.temperature, float)


def test_route_byo_none_tenant_config():
    # None tenant_config should not raise
    config = route_model(TaskType.PLANNING, tenant_config=None)
    assert config.provider == "ollama"


def test_route_byo_empty_tenant_config():
    # Empty dict should not trigger BYO
    config = route_model(TaskType.PLANNING, tenant_config={})
    assert config.provider == "ollama"


def test_fallback_chain_skips_open_circuit(monkeypatch: pytest.MonkeyPatch) -> None:
    from agent_core.circuit_breaker import model_circuit_registry
    from agent_core.model_router import select_model_with_fallback

    monkeypatch.setenv("OLLAMA_FALLBACK_CHAIN", "qwen2.5:3b-instruct-q4_K_M,qwen2.5:1.5b-instruct-q4_K_M")
    primary = "qwen2.5:7b"
    model_circuit_registry.get(primary).record_failure()
    model_circuit_registry.get(primary).record_failure()
    model_circuit_registry.get(primary).record_failure()
    model_circuit_registry.get(primary).record_failure()
    model_circuit_registry.get(primary).record_failure()

    selected = select_model_with_fallback(primary)
    assert selected == "qwen2.5:3b-instruct-q4_K_M"


# ── env_resolver tests ────────────────────────────────────────────────────────

def test_env_resolver_reads_canonical(monkeypatch):
    from agent_core.env_resolver import resolve_env, AGENT_OLLAMA_BASE_URL
    monkeypatch.setenv("AGENT_OLLAMA_BASE_URL", "http://canonical-host:11434")
    result = resolve_env(AGENT_OLLAMA_BASE_URL, "")
    assert result == "http://canonical-host:11434"


def test_env_resolver_reads_deprecated_alias(monkeypatch):
    from agent_core.env_resolver import resolve_env, AGENT_OLLAMA_BASE_URL
    monkeypatch.setenv("CEG_OLLAMA_BASE_URL", "http://old-host:11434")
    monkeypatch.delenv("AGENT_OLLAMA_BASE_URL", raising=False)
    result = resolve_env(AGENT_OLLAMA_BASE_URL, "")
    assert result == "http://old-host:11434"


def test_env_resolver_canonical_wins_over_deprecated(monkeypatch):
    from agent_core.env_resolver import resolve_env, AGENT_OLLAMA_BASE_URL
    monkeypatch.setenv("AGENT_OLLAMA_BASE_URL", "http://canonical:11434")
    monkeypatch.setenv("CEG_OLLAMA_BASE_URL", "http://deprecated:11434")
    result = resolve_env(AGENT_OLLAMA_BASE_URL, "")
    assert result == "http://canonical:11434"


def test_env_resolver_returns_default(monkeypatch):
    from agent_core.env_resolver import resolve_env, AGENT_OLLAMA_BASE_URL
    monkeypatch.delenv("AGENT_OLLAMA_BASE_URL", raising=False)
    monkeypatch.delenv("CEG_OLLAMA_BASE_URL", raising=False)
    monkeypatch.delenv("OLLAMA_BASE_URL", raising=False)
    monkeypatch.delenv("WORKSHOPOS_OLLAMA_URL", raising=False)
    monkeypatch.delenv("FETCHDESK_OLLAMA_URL", raising=False)
    monkeypatch.delenv("OLLAMA_URL", raising=False)
    result = resolve_env(AGENT_OLLAMA_BASE_URL, "http://localhost:11434")
    assert result == "http://localhost:11434"
