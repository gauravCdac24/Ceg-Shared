from __future__ import annotations

import json
import time
from typing import Any

from ai_providers.http_pool import get_async_http_client
from ai_providers.resolver import ResolvedLLMConfig
from ai_providers.retry import with_retries
from ai_providers.schemas import AiProviderKind, TestConnectionResult
from ai_providers.usage import (
    TokenUsage,
    from_anthropic,
    from_ollama_generate,
    from_openai_compat,
    get_last_token_usage,
    set_last_token_usage,
)

__all__ = [
    "LLMClientError",
    "chat_json",
    "chat_text",
    "get_last_token_usage",
    "test_connection",
]


class LLMClientError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


def _set_last_usage(usage: TokenUsage) -> None:
    set_last_token_usage(usage)


async def chat_text(
    cfg: ResolvedLLMConfig,
    *,
    prompt: str,
    system: str = "",
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    json_mode: bool = False,
) -> str:
    use_model = model or cfg.model

    async def _once() -> str:
        if cfg.provider == AiProviderKind.ollama:
            return await _ollama_chat(cfg, prompt, system, use_model, temperature, max_tokens, json_mode)
        if cfg.provider == AiProviderKind.anthropic:
            return await _anthropic_chat(cfg, prompt, system, use_model, temperature, max_tokens)
        if cfg.provider == AiProviderKind.google:
            return await _google_chat(cfg, prompt, system, use_model, temperature, max_tokens, json_mode)
        return await _openai_compat_chat(cfg, prompt, system, use_model, temperature, max_tokens, json_mode)

    return await with_retries(_once)


async def chat_json(
    cfg: ResolvedLLMConfig,
    *,
    prompt: str,
    system: str = "",
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> dict[str, Any]:
    text = await chat_text(
        cfg,
        prompt=prompt,
        system=system or "Respond with valid JSON only.",
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        json_mode=True,
    )
    return _extract_json(text)


async def test_connection(cfg: ResolvedLLMConfig) -> TestConnectionResult:
    started = time.perf_counter()
    try:
        reply = await chat_text(
            cfg,
            prompt="Reply with exactly: OK",
            system="You are a connectivity test. Reply with OK only.",
            model=cfg.model_fast or cfg.model,
            temperature=0,
            max_tokens=16,
        )
        latency = int((time.perf_counter() - started) * 1000)
        ok = "ok" in (reply or "").lower()
        return TestConnectionResult(
            ok=ok,
            message="Connection successful." if ok else f"Unexpected reply: {reply[:120]}",
            model_used=cfg.model_fast or cfg.model,
            latency_ms=latency,
        )
    except LLMClientError as exc:
        return TestConnectionResult(ok=False, message=str(exc))
    except Exception as exc:
        return TestConnectionResult(ok=False, message=f"Connection failed: {exc}")


async def _ollama_chat(
    cfg: ResolvedLLMConfig,
    prompt: str,
    system: str,
    model: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool,
) -> str:
    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "options": {"temperature": temperature, "num_predict": max_tokens},
    }
    if json_mode:
        payload["format"] = "json"
    url = f"{cfg.base_url}/api/generate"
    client = get_async_http_client(timeout_sec=float(cfg.timeout_sec))
    r = await client.post(url, json=payload)
    if r.status_code >= 400:
        raise LLMClientError(f"Ollama error ({r.status_code})", status_code=r.status_code)
    body = r.json()
    _set_last_usage(from_ollama_generate(body if isinstance(body, dict) else None))
    return str((body or {}).get("response") or "")


async def _openai_compat_chat(
    cfg: ResolvedLLMConfig,
    prompt: str,
    system: str,
    model: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool,
) -> str:
    base = cfg.base_url.rstrip("/")
    if not base:
        raise LLMClientError("Base URL is required for this provider")
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
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    client = get_async_http_client(timeout_sec=float(cfg.timeout_sec))
    r = await client.post(url, json=payload, headers=headers)
    if r.status_code >= 400:
        raise LLMClientError(f"LLM API error ({r.status_code}): {r.text[:200]}", status_code=r.status_code)
    body = r.json()
    _set_last_usage(from_openai_compat(body if isinstance(body, dict) else None))
    return str(((body.get("choices") or [{}])[0].get("message") or {}).get("content") or "")


async def _anthropic_chat(
    cfg: ResolvedLLMConfig,
    prompt: str,
    system: str,
    model: str,
    temperature: float,
    max_tokens: int,
) -> str:
    if not cfg.api_key:
        raise LLMClientError("Anthropic API key is required")
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
    }
    client = get_async_http_client(timeout_sec=float(cfg.timeout_sec))
    r = await client.post(url, json=payload, headers=headers)
    if r.status_code >= 400:
        raise LLMClientError(f"Anthropic error ({r.status_code}): {r.text[:200]}", status_code=r.status_code)
    body = r.json()
    _set_last_usage(from_anthropic(body if isinstance(body, dict) else None))
    parts = body.get("content") or []
    return "".join(str(p.get("text") or "") for p in parts if isinstance(p, dict))


async def _google_chat(
    cfg: ResolvedLLMConfig,
    prompt: str,
    system: str,
    model: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool,
) -> str:
    if not cfg.api_key:
        raise LLMClientError("Google Gemini API key is required")
    base = cfg.base_url.rstrip("/")
    url = f"{base}/models/{model}:generateContent"
    params = {"key": cfg.api_key}
    payload: dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    if json_mode:
        payload["generationConfig"]["responseMimeType"] = "application/json"
    client = get_async_http_client(timeout_sec=float(cfg.timeout_sec))
    r = await client.post(url, params=params, json=payload)
    if r.status_code >= 400:
        raise LLMClientError(f"Gemini error ({r.status_code}): {r.text[:200]}", status_code=r.status_code)
    body = r.json()
    candidates = body.get("candidates") or []
    if not candidates:
        return ""
    parts = ((candidates[0].get("content") or {}).get("parts") or [])
    return "".join(str(p.get("text") or "") for p in parts if isinstance(p, dict))


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = (text or "").strip()
    if not cleaned:
        return {}
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    fence = cleaned.find("```")
    if fence >= 0:
        inner = cleaned[fence + 3 :]
        if inner.startswith("json"):
            inner = inner[4:]
        end = inner.find("```")
        if end >= 0:
            inner = inner[:end]
        try:
            return json.loads(inner.strip())
        except json.JSONDecodeError:
            pass
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError:
            pass
    raise LLMClientError("Model did not return valid JSON")
