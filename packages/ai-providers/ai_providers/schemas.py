from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class _AiProviderSchema(BaseModel):
    """Base config — `model_fast` / `model_used` are domain fields, not Pydantic internals."""

    model_config = ConfigDict(protected_namespaces=())


class AiProviderMode(str, Enum):
    platform = "platform"
    byo = "byo"


class AiProviderKind(str, Enum):
    ollama = "ollama"
    openai = "openai"
    anthropic = "anthropic"
    google = "google"
    openai_compatible = "openai_compatible"


PROVIDER_DEFAULTS: dict[str, dict[str, str]] = {
    AiProviderKind.ollama.value: {
        "base_url": "http://127.0.0.1:11434",
        "model": "qwen2.5:7b",
        "model_fast": "qwen2.5:7b",
    },
    AiProviderKind.openai.value: {
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
        "model_fast": "gpt-4o-mini",
    },
    AiProviderKind.anthropic.value: {
        "base_url": "https://api.anthropic.com",
        "model": "claude-3-5-haiku-20241022",
        "model_fast": "claude-3-5-haiku-20241022",
    },
    AiProviderKind.google.value: {
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "model": "gemini-2.0-flash",
        "model_fast": "gemini-2.0-flash",
    },
    AiProviderKind.openai_compatible.value: {
        "base_url": "",
        "model": "gpt-4o-mini",
        "model_fast": "gpt-4o-mini",
    },
}


class AiProviderSaveRequest(_AiProviderSchema):
    mode: AiProviderMode = AiProviderMode.platform
    provider: AiProviderKind = AiProviderKind.ollama
    model: str = Field(default="", max_length=120)
    model_fast: str = Field(default="", max_length=120)
    base_url: str = Field(default="", max_length=500)
    api_key: str | None = Field(default=None, max_length=512, description="Plain key on save only")

    @model_validator(mode="after")
    def _byo_rejects_ollama(self) -> AiProviderSaveRequest:
        # Hosted Cert Studio cannot reach a laptop's localhost Ollama.
        if self.mode == AiProviderMode.byo and self.provider == AiProviderKind.ollama:
            raise ValueError(
                "Bring-your-own mode does not support Ollama. "
                "Use OpenAI, Claude, Gemini, or an OpenAI-compatible endpoint."
            )
        return self


class AiProviderPublicSettings(_AiProviderSchema):
    mode: AiProviderMode = AiProviderMode.platform
    provider: AiProviderKind = AiProviderKind.ollama
    model: str = ""
    model_fast: str = ""
    base_url: str = ""
    api_key_hint: str | None = None
    has_api_key: bool = False
    platform_default_provider: str = "ollama"
    platform_default_model: str = ""


class AiProviderSettingsStored(_AiProviderSchema):
    mode: AiProviderMode = AiProviderMode.platform
    provider: AiProviderKind = AiProviderKind.ollama
    model: str = ""
    model_fast: str = ""
    base_url: str = ""
    api_key_encrypted: str = ""
    api_key_hint: str = ""

    def to_public(self, *, platform_default_model: str) -> AiProviderPublicSettings:
        return AiProviderPublicSettings(
            mode=self.mode,
            provider=self.provider,
            model=self.model,
            model_fast=self.model_fast,
            base_url=self.base_url,
            api_key_hint=self.api_key_hint or None,
            has_api_key=bool(self.api_key_encrypted),
            platform_default_provider="ollama",
            platform_default_model=platform_default_model,
        )

    @classmethod
    def from_dict(cls, raw: dict[str, Any] | None) -> AiProviderSettingsStored:
        if not raw:
            return cls()
        data = dict(raw)
        try:
            return cls.model_validate(data)
        except Exception:
            return cls()


class TestConnectionResult(_AiProviderSchema):
    ok: bool
    message: str
    model_used: str | None = None
    latency_ms: int | None = None
