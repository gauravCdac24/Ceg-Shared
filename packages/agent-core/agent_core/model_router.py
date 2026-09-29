"""TaskKind → model routing (platform defaults and BYO overrides)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING

import structlog

from agent_core.circuit_breaker import model_circuit_registry
from agent_core.env_resolver import OLLAMA_FALLBACK_CHAIN, OLLAMA_NUM_CTX, resolve_env, resolve_int_env
from agent_core.language_detect import detect_language, is_indic_language
from agent_core.schemas import TaskKind

if TYPE_CHECKING:
    from ai_providers.resolver import ResolvedLLMConfig

log = structlog.get_logger(__name__)


# ── Sprint 4: Standalone route_model() with provider priority fallback ────────

class TaskType(str, Enum):
    SIMPLE_CHAT = "simple_chat"
    PLANNING = "planning"
    VISION = "vision"
    EMBEDDING = "embedding"
    CODE_OR_JSON = "code_or_structured_json"
    TRANSLATION = "translation"


@dataclass
class ModelConfig:
    provider: str
    model_name: str
    base_url: str | None
    max_tokens: int
    temperature: float


def _parse_fallback_chain(primary: str) -> list[str]:
    """Primary model first, then OLLAMA_FALLBACK_CHAIN entries (deduped)."""
    primary = (primary or "").strip()
    chain_raw = resolve_env(OLLAMA_FALLBACK_CHAIN, "").strip()
    if chain_raw:
        extras = [m.strip() for m in chain_raw.split(",") if m.strip()]
    else:
        extras = []
    ordered: list[str] = []
    for name in [primary, *extras]:
        if name and name not in ordered:
            ordered.append(name)
    return ordered or ([primary] if primary else [])


def select_model_with_fallback(primary: str) -> str:
    """Return first model in the fallback chain whose circuit breaker is closed."""
    candidates = _parse_fallback_chain(primary)
    if not candidates:
        return primary
    for model in candidates:
        if not model_circuit_registry.get(model).is_open:
            if model != primary:
                log.info(
                    "model_router_fallback",
                    primary=primary,
                    selected=model,
                    reason="circuit_open_on_primary",
                )
            return model
    log.warning(
        "model_router_fallback_exhausted",
        primary=primary,
        chain=candidates,
    )
    return primary


def apply_indic_language_overrides(
    config: ModelConfig,
    *,
    user_text: str = "",
) -> ModelConfig:
    """Raise ctx/num_predict and lower temperature for Hindi and related Indic scripts."""
    lang = detect_language(user_text)
    if not is_indic_language(lang):
        return config
    boosted_ctx = max(resolve_int_env(OLLAMA_NUM_CTX, profile_default=4096), 6144)
    log.info(
        "model_router_indic_language",
        detected_language=lang,
        provider=config.provider,
        model=config.model_name,
        num_ctx=boosted_ctx,
    )
    return ModelConfig(
        provider=config.provider,
        model_name=config.model_name,
        base_url=config.base_url,
        max_tokens=max(config.max_tokens, 3072),
        temperature=min(config.temperature, 0.35),
    )


def route_model(task_type: TaskType, tenant_config: dict | None = None) -> ModelConfig:
    """Return the best ModelConfig for this task type.

    Priority:
    1. Tenant BYO provider (from tenant_config) if available for planning/vision tasks
    2. Local capable Ollama model (OLLAMA_CAPABLE_MODEL env var, default qwen2.5:14b)
    3. Local cheap Ollama model (OLLAMA_CHEAP_MODEL env var, default qwen2.5:7b)
    """
    byo_provider = tenant_config.get("ai_provider") if tenant_config else None
    byo_model = tenant_config.get("ai_model") if tenant_config else None
    ollama_url = os.getenv("AGENT_OLLAMA_BASE_URL", os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
    capable_model = os.getenv("OLLAMA_CAPABLE_MODEL", "qwen2.5:14b")
    cheap_model = os.getenv("OLLAMA_CHEAP_MODEL", "qwen2.5:7b")

    planning_tasks = {TaskType.PLANNING, TaskType.CODE_OR_JSON}

    if byo_provider and byo_model:
        if task_type in planning_tasks or task_type == TaskType.VISION:
            return ModelConfig(
                provider=byo_provider,
                model_name=byo_model,
                base_url=None,
                max_tokens=4096,
                temperature=0.2,
            )

    if task_type == TaskType.EMBEDDING:
        embed_model = select_model_with_fallback(
            os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
        )
        return ModelConfig(
            provider="ollama",
            model_name=embed_model,
            base_url=ollama_url,
            max_tokens=0,
            temperature=0.0,
        )

    if task_type == TaskType.VISION:
        vision_model = select_model_with_fallback(os.getenv("OLLAMA_VISION_MODEL", "llava:13b"))
        return ModelConfig(
            provider="ollama",
            model_name=vision_model,
            base_url=ollama_url,
            max_tokens=2048,
            temperature=0.1,
        )

    if task_type in planning_tasks:
        capable = select_model_with_fallback(capable_model)
        return ModelConfig(
            provider="ollama",
            model_name=capable,
            base_url=ollama_url,
            max_tokens=4096,
            temperature=0.2,
        )

    # Default: cheap fast model for simple chat and translation
    cheap = select_model_with_fallback(cheap_model)
    return ModelConfig(
        provider="ollama",
        model_name=cheap,
        base_url=ollama_url,
        max_tokens=2048,
        temperature=0.7,
    )


# ── Existing ModelRouter class (keep for backward compat) ─────────────────────

@dataclass(frozen=True)
class RouteDecision:
    model: str
    task_kind: TaskKind
    use_json_mode: bool = False


class ModelRouter:
    def __init__(
        self,
        *,
        platform_default: str,
        platform_fast: str,
        platform_json: str,
        platform_embedding: str = "nomic-embed-text",
        platform_vision: str | None = None,
        resolved: ResolvedLLMConfig | None = None,
        product_overrides: dict[TaskKind, str] | None = None,
    ) -> None:
        self._platform_default = platform_default
        self._platform_fast = platform_fast
        self._platform_json = platform_json
        self._platform_embedding = platform_embedding
        self._platform_vision = platform_vision or platform_default
        self._resolved = resolved
        self._product_overrides = product_overrides or {}

    def route(self, task_kind: TaskKind) -> RouteDecision:
        if task_kind in self._product_overrides:
            model = self._product_overrides[task_kind]
            return RouteDecision(
                model=model,
                task_kind=task_kind,
                use_json_mode=task_kind == TaskKind.json_extract,
            )
        if self._resolved and self._resolved.is_byo:
            return RouteDecision(
                model=self._pick_byo_model(task_kind),
                task_kind=task_kind,
                use_json_mode=task_kind == TaskKind.json_extract,
            )
        defaults = {
            TaskKind.agent_loop: self._platform_default,
            TaskKind.json_extract: self._platform_json,
            TaskKind.chat_fast: self._platform_fast,
            TaskKind.embedding: self._platform_embedding,
            TaskKind.formal_rewrite: self._platform_default,
            TaskKind.planning: self._platform_default,
            TaskKind.vision: self._platform_vision,
        }
        model = defaults.get(task_kind, self._platform_default)
        model = select_model_with_fallback(model)
        return RouteDecision(
            model=model,
            task_kind=task_kind,
            use_json_mode=task_kind == TaskKind.json_extract,
        )

    def _pick_byo_model(self, task_kind: TaskKind) -> str:
        if not self._resolved:
            return self._platform_default
        if task_kind in (TaskKind.chat_fast, TaskKind.embedding):
            return self._resolved.model_fast or self._resolved.model
        if task_kind == TaskKind.json_extract:
            return self._resolved.model
        return self._resolved.model
