from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ai_providers.schemas import (
    AiProviderKind,
    AiProviderMode,
    AiProviderPublicSettings,
    AiProviderSaveRequest,
    AiProviderSettingsStored,
    PROVIDER_DEFAULTS,
)


@dataclass(frozen=True)
class ResolvedLLMConfig:
    provider: AiProviderKind
    base_url: str
    api_key: str
    model: str
    model_fast: str
    timeout_sec: float
    is_byo: bool


def resolve_llm_config(
    stored: AiProviderSettingsStored | dict | None,
    *,
    platform_base_url: str,
    platform_model: str,
    platform_model_fast: str,
    timeout_sec: float = 120.0,
) -> ResolvedLLMConfig:
    settings = (
        stored
        if isinstance(stored, AiProviderSettingsStored)
        else AiProviderSettingsStored.from_dict(stored if isinstance(stored, dict) else None)
    )

    if settings.mode != AiProviderMode.byo:
        return ResolvedLLMConfig(
            provider=AiProviderKind.ollama,
            base_url=platform_base_url.rstrip("/"),
            api_key="",
            model=platform_model,
            model_fast=platform_model_fast or platform_model,
            timeout_sec=timeout_sec,
            is_byo=False,
        )

    defaults = PROVIDER_DEFAULTS.get(settings.provider.value, PROVIDER_DEFAULTS["ollama"])
    base_url = (settings.base_url or defaults["base_url"]).rstrip("/")
    model = settings.model or defaults["model"]
    model_fast = settings.model_fast or settings.model or defaults["model_fast"]

    from ai_providers.crypto import decrypt_secret

    return ResolvedLLMConfig(
        provider=settings.provider,
        base_url=base_url,
        api_key=decrypt_secret(settings.api_key_encrypted),
        model=model,
        model_fast=model_fast,
        timeout_sec=timeout_sec,
        is_byo=True,
    )


def merge_save_request(
    existing: AiProviderSettingsStored,
    payload: AiProviderSaveRequest,
) -> AiProviderSettingsStored:
    from ai_providers.crypto import encrypt_secret, mask_api_key
    from ai_providers.url_safety import validate_byo_base_url

    defaults = PROVIDER_DEFAULTS.get(payload.provider.value, PROVIDER_DEFAULTS["ollama"])
    base_url = (payload.base_url or defaults.get("base_url", "")).strip()
    if payload.mode == AiProviderMode.byo and base_url:
        base_url = validate_byo_base_url(base_url)
    out = AiProviderSettingsStored(
        mode=payload.mode,
        provider=payload.provider,
        model=(payload.model or defaults["model"]).strip(),
        model_fast=(payload.model_fast or payload.model or defaults["model_fast"]).strip(),
        base_url=base_url,
        api_key_encrypted=existing.api_key_encrypted,
        api_key_hint=existing.api_key_hint,
    )

    if payload.api_key and payload.api_key.strip():
        plain = payload.api_key.strip()
        out.api_key_encrypted = encrypt_secret(plain)
        out.api_key_hint = mask_api_key(plain)

    if payload.mode == AiProviderMode.platform:
        out.api_key_encrypted = ""
        out.api_key_hint = ""

    return out


def merge_ai_settings_json(
    existing_raw: dict[str, Any] | None,
    stored: AiProviderSettingsStored,
) -> dict[str, Any]:
    """Merge provider fields into tenant ai_settings without dropping nested keys (e.g. agent_capabilities)."""
    out = dict(existing_raw or {})
    out.update(stored.model_dump(mode="json"))
    return out


def to_public_settings(
    stored: AiProviderSettingsStored | dict | None,
    *,
    platform_default_model: str,
) -> AiProviderPublicSettings:
    settings = (
        stored
        if isinstance(stored, AiProviderSettingsStored)
        else AiProviderSettingsStored.from_dict(stored if isinstance(stored, dict) else None)
    )
    return settings.to_public(platform_default_model=platform_default_model)
