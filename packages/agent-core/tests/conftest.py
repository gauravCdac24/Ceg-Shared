from __future__ import annotations

import pytest

from agent_core.guardrails import Guardrails
from agent_core.memory_service import MemoryService
from agent_core.model_router import ModelRouter
from agent_core.ollama_client import OllamaClient
from agent_core.prompt_builder import PromptBuilder
from agent_core.tool_registry import ToolRegistry


@pytest.fixture
def registry() -> ToolRegistry:
    return ToolRegistry()


@pytest.fixture
def memory() -> MemoryService:
    return MemoryService()


@pytest.fixture
def guardrails() -> Guardrails:
    return Guardrails()


@pytest.fixture
def prompt_builder() -> PromptBuilder:
    return PromptBuilder()


@pytest.fixture
def router() -> ModelRouter:
    return ModelRouter(
        platform_default="llama3.2",
        platform_fast="qwen2.5:3b",
        platform_json="llama3.2",
    )


@pytest.fixture
def ollama_client() -> OllamaClient:
    return OllamaClient(base_url="http://localhost:11434", timeout_sec=5.0)
