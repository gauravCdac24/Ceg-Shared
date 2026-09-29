"""BYO provider streaming chat — OpenAI/Azure-compatible and Anthropic."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx

from ai_providers.clients import chat_text
from ai_providers.resolver import ResolvedLLMConfig
from ai_providers.schemas import AiProviderKind


async def stream_chat(
    cfg: ResolvedLLMConfig,
    *,
    prompt: str,
    system: str = "",
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    json_mode: bool = False,
) -> AsyncIterator[str]:
    """Yield tokens from BYO providers; single-yield fallback for unsupported backends."""
    use_model = model or cfg.model
    provider = cfg.provider
    if provider in (
        AiProviderKind.openai,
        AiProviderKind.openai_compatible,
    ):
        async for token in _openai_compat_stream(
            cfg,
            prompt,
            system,
            use_model,
            temperature,
            max_tokens,
            json_mode,
        ):
            yield token
        return
    if provider == AiProviderKind.anthropic:
        async for token in _anthropic_stream(
            cfg,
            prompt,
            system,
            use_model,
            temperature,
            max_tokens,
        ):
            yield token
        return
    text = await chat_text(
        cfg,
        prompt=prompt,
        system=system,
        model=use_model,
        temperature=temperature,
        max_tokens=max_tokens,
        json_mode=json_mode,
    )
    if text:
        yield text


async def _openai_compat_stream(
    cfg: ResolvedLLMConfig,
    prompt: str,
    system: str,
    model: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool,
) -> AsyncIterator[str]:
    base = (cfg.base_url or "").rstrip("/")
    if not base:
        raise RuntimeError("Base URL is required for OpenAI-compatible streaming")
    url = f"{base}/chat/completions"
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if cfg.api_key:
        headers["Authorization"] = f"Bearer {cfg.api_key}"
    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system or "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    async with httpx.AsyncClient(timeout=cfg.timeout_sec) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as response:
            if response.status_code >= 400:
                body = await response.aread()
                raise RuntimeError(f"LLM stream error ({response.status_code}): {body[:200]!r}")
            async for line in response.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    continue
                delta = ((chunk.get("choices") or [{}])[0].get("delta") or {}).get("content") or ""
                if delta:
                    yield str(delta)


async def _anthropic_stream(
    cfg: ResolvedLLMConfig,
    prompt: str,
    system: str,
    model: str,
    temperature: float,
    max_tokens: int,
) -> AsyncIterator[str]:
    if not cfg.api_key:
        raise RuntimeError("Anthropic API key is required")
    url = f"{cfg.base_url.rstrip('/')}/v1/messages"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": cfg.api_key,
        "anthropic-version": "2023-06-01",
    }
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "system": system or "You are a helpful assistant.",
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=cfg.timeout_sec) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as response:
            if response.status_code >= 400:
                body = await response.aread()
                raise RuntimeError(f"Anthropic stream error ({response.status_code}): {body[:200]!r}")
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data:
                    continue
                try:
                    event = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if event.get("type") == "content_block_delta":
                    delta = (event.get("delta") or {}).get("text") or ""
                    if delta:
                        yield str(delta)
