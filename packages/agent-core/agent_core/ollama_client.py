"""Thin httpx wrapper for Ollama /api/chat with streaming and native tool calling."""

from __future__ import annotations

import json
import os
import re
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

import httpx
import structlog

from agent_core.http_pool import ollama_http_client
from agent_core.circuit_breaker import CircuitBreaker, model_circuit_registry
from agent_core.env_resolver import (
    AGENT_OLLAMA_BASE_URL,
    OLLAMA_KEEP_ALIVE,
    OLLAMA_NUM_CTX,
    OLLAMA_NUM_CTX_FAST,
    resolve_env,
    resolve_int_env,
)
from agent_core.schemas import TaskKind

log = structlog.get_logger(__name__)

DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"

_AI_DEBUG_ENV_KEYS = ("AGENT_AI_DEBUG", "AI_DEBUG")


def _ai_request_logging_enabled() -> bool:
    for key in _AI_DEBUG_ENV_KEYS:
        if resolve_env(key, "").strip().lower() in ("1", "true", "yes", "on"):
            return True
    return False

_FALLBACK_MODEL_CANDIDATES = (
    "llama3.2:3b",
    "llama3.2:1b",
    "llama3.2",
    "llama3.2:latest",
    "qwen2.5:7b-instruct",
    "qwen2.5:7b",
    "qwen2.5:3b",
    "phi3",
    "phi3:latest",
)


def _fallback_candidates(requested_model: str) -> list[str]:
    out: list[str] = []
    for raw in (requested_model, *_FALLBACK_MODEL_CANDIDATES):
        name = (raw or "").strip()
        if name and name not in out:
            out.append(name)
    return out


def _pick_available_model(preferred: list[str], available: list[str]) -> str | None:
    if not preferred or not available:
        return None
    available_set = set(available)
    for candidate in preferred:
        if candidate in available_set:
            return candidate
    for candidate in preferred:
        base = candidate.split(":")[0]
        for name in available:
            if name.split(":")[0] == base:
                return name
    return None


def _default_num_ctx(task_kind: TaskKind) -> int:
    if task_kind in (TaskKind.chat_fast, TaskKind.json_extract):
        return resolve_int_env(OLLAMA_NUM_CTX_FAST, profile_default=1024)
    return resolve_int_env(OLLAMA_NUM_CTX, profile_default=2048)


def _default_keep_alive() -> int | str:
    raw = resolve_env(OLLAMA_KEEP_ALIVE, "")
    if raw.strip():
        try:
            return int(raw.strip())
        except ValueError:
            return raw.strip()
    return resolve_int_env(OLLAMA_KEEP_ALIVE, profile_default=0)


def _inject_ollama_runtime(
    payload: dict[str, Any],
    *,
    task_kind: TaskKind,
    options: dict[str, Any] | None = None,
    keep_alive: int | None = None,
) -> dict[str, Any]:
    merged_options = dict(payload.get("options") or {})
    if options:
        merged_options.update(options)
    if "num_ctx" not in merged_options:
        merged_options["num_ctx"] = _default_num_ctx(task_kind)
    payload["options"] = merged_options
    if "keep_alive" not in payload:
        payload["keep_alive"] = _default_keep_alive() if keep_alive is None else keep_alive
    return payload


class OllamaClientError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        model: str | None = None,
        recoverable: bool = False,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.model = model
        self.recoverable = recoverable


@dataclass
class ChatCompletion:
    content: str = ""
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    model: str = ""


def _extract_json_from_text(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        raise OllamaClientError("Empty LLM response")
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL | re.IGNORECASE)
    if fence:
        return json.loads(fence.group(1))
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        return json.loads(raw[start : end + 1])
    raise OllamaClientError("Could not parse JSON from LLM response")


class OllamaClient:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        timeout_sec: float = 120.0,
        resolved: Any | None = None,
        circuit_breaker: CircuitBreaker | None = None,
    ) -> None:
        resolved_url = base_url or resolve_env(AGENT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_BASE_URL)
        self.base_url = resolved_url.rstrip("/")
        self.timeout_sec = timeout_sec
        self.resolved = resolved
        self.circuit_breaker = circuit_breaker or CircuitBreaker()

    def _circuit_for(self, model: str) -> CircuitBreaker:
        return model_circuit_registry.get(model)

    def _record_success(self, model: str) -> None:
        self._circuit_for(model).record_success()
        if self.circuit_breaker is not None:
            self.circuit_breaker.record_success()

    def _ensure_circuit_closed(self, model: str) -> None:
        try:
            self._circuit_for(model).assert_closed()
        except RuntimeError as exc:
            raise OllamaClientError(str(exc), recoverable=True, model=model) from exc

    def _record_failure(self, model: str, error_body: str | None = None) -> None:
        self._circuit_for(model).record_failure(error_body=error_body, model=model)
        if self.circuit_breaker is not None:
            self.circuit_breaker.record_failure(error_body=error_body, model=model)

    async def resolve_installed_model(self, requested: str) -> str | None:
        """Pick best installed Ollama tag for ``requested`` via /api/tags."""
        requested_model = (requested or "").strip()
        if not requested_model:
            return None
        available = await self.list_models()
        return _pick_available_model(_fallback_candidates(requested_model), available)

    async def complete_chat(
        self,
        *,
        system: str,
        prompt: str,
        model: str,
        temperature: float = 0.4,
        max_tokens: int = 2048,
        tools: list[dict[str, Any]] | None = None,
        stream: bool = False,
        task_kind: TaskKind = TaskKind.agent_loop,
    ) -> ChatCompletion:
        """Non-streaming or streaming chat with native tool call capture."""
        self._ensure_circuit_closed(model)
        resolved = await self.resolve_installed_model(model)
        if resolved:
            model = resolved
        if stream:
            content_parts: list[str] = []
            async for token in self.stream_chat(
                system=system,
                prompt=prompt,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                tools=tools,
                task_kind=task_kind,
            ):
                content_parts.append(token)
            return ChatCompletion(content="".join(content_parts), model=model)

        if self.resolved and getattr(self.resolved, "is_byo", False):
            from ai_providers.clients import chat_text

            text = await chat_text(
                self.resolved,
                prompt=prompt,
                system=system,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=task_kind == TaskKind.json_extract,
            )
            self._record_success(model)
            return ChatCompletion(content=text, model=model)

        payload: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        if tools:
            payload["tools"] = tools
        _inject_ollama_runtime(payload, task_kind=task_kind)
        url = f"{self.base_url}/api/chat"
        started = time.perf_counter()
        log_request = _ai_request_logging_enabled()
        if log_request:
            log.info(
                "ollama_chat_start",
                model=model,
                task_kind=task_kind.value,
                stream=False,
                prompt_chars=len(prompt or ""),
            )
        try:
            async with ollama_http_client(timeout_sec=float(self.timeout_sec)) as client:
                response = await client.post(url, json=payload)
                if response.status_code >= 400:
                    err_body = response.text
                    self._record_failure(model, err_body)
                    raise OllamaClientError(
                        f"Ollama error {response.status_code}",
                        status_code=response.status_code,
                        model=model,
                        recoverable=response.status_code >= 500,
                    )
                try:
                    data = response.json()
                except json.JSONDecodeError as exc:
                    self._record_failure(model, str(exc))
                    raise OllamaClientError(
                        f"Invalid JSON from Ollama: {exc}",
                        model=model,
                        recoverable=True,
                    ) from exc
                message = data.get("message") or {}
                content = message.get("content") or ""
                tool_calls = message.get("tool_calls") or []
                self._record_success(model)
                if log_request:
                    log.info(
                        "ollama_chat_done",
                        model=model,
                        task_kind=task_kind.value,
                        duration_ms=int((time.perf_counter() - started) * 1000),
                        response_chars=len(content),
                    )
                return ChatCompletion(
                    content=content,
                    tool_calls=tool_calls if isinstance(tool_calls, list) else [],
                    model=model,
                )
        except OllamaClientError:
            if log_request:
                log.info(
                    "ollama_chat_error",
                    model=model,
                    task_kind=task_kind.value,
                    duration_ms=int((time.perf_counter() - started) * 1000),
                )
            raise
        except httpx.RequestError as exc:
            self._record_failure(model, str(exc))
            if log_request:
                log.info(
                    "ollama_chat_error",
                    model=model,
                    task_kind=task_kind.value,
                    duration_ms=int((time.perf_counter() - started) * 1000),
                    error=str(exc)[:200],
                )
            raise OllamaClientError(
                f"Ollama connection failed: {exc}",
                model=model,
                recoverable=True,
            ) from exc

    async def stream_chat(
        self,
        *,
        system: str,
        prompt: str,
        model: str,
        temperature: float = 0.4,
        max_tokens: int = 2048,
        tools: list[dict[str, Any]] | None = None,
        task_kind: TaskKind = TaskKind.agent_loop,
    ) -> AsyncIterator[str]:
        self._ensure_circuit_closed(model)
        resolved = await self.resolve_installed_model(model)
        if resolved:
            model = resolved
        if self.resolved and getattr(self.resolved, "is_byo", False):
            from ai_providers.byo_chat import stream_chat as byo_stream_chat

            async for token in byo_stream_chat(
                self.resolved,
                prompt=prompt,
                system=system,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=task_kind == TaskKind.json_extract,
            ):
                yield token
            self._record_success(model)
            return

        payload: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "stream": True,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        if tools:
            payload["tools"] = tools
        _inject_ollama_runtime(payload, task_kind=task_kind)
        url = f"{self.base_url}/api/chat"
        started = time.perf_counter()
        log_request = _ai_request_logging_enabled()
        if log_request:
            log.info(
                "ollama_chat_start",
                model=model,
                task_kind=task_kind.value,
                stream=True,
                prompt_chars=len(prompt or ""),
            )
        try:
            async with ollama_http_client(timeout_sec=float(self.timeout_sec)) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code >= 400:
                        body = await response.aread()
                        err_text = body.decode("utf-8", errors="replace")
                        self._record_failure(model, err_text)
                        raise OllamaClientError(
                            f"Ollama error {response.status_code}: {err_text[:200]}",
                            status_code=response.status_code,
                            model=model,
                            recoverable=response.status_code >= 500,
                        )
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        message = chunk.get("message") or {}
                        token = message.get("content") or ""
                        if token:
                            yield token
                        if chunk.get("done"):
                            break
                    self._record_success(model)
                    if log_request:
                        log.info(
                            "ollama_chat_done",
                            model=model,
                            task_kind=task_kind.value,
                            duration_ms=int((time.perf_counter() - started) * 1000),
                            stream=True,
                        )
        except OllamaClientError:
            if log_request:
                log.info(
                    "ollama_chat_error",
                    model=model,
                    task_kind=task_kind.value,
                    duration_ms=int((time.perf_counter() - started) * 1000),
                    stream=True,
                )
            raise
        except httpx.RequestError as exc:
            self._record_failure(model, str(exc))
            if log_request:
                log.info(
                    "ollama_chat_error",
                    model=model,
                    task_kind=task_kind.value,
                    duration_ms=int((time.perf_counter() - started) * 1000),
                    stream=True,
                    error=str(exc)[:200],
                )
            raise OllamaClientError(
                f"Ollama connection failed: {exc}",
                model=model,
                recoverable=True,
            ) from exc

    async def chat_json(
        self,
        *,
        system: str,
        prompt: str,
        model: str,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        task_kind: TaskKind = TaskKind.json_extract,
        options: dict[str, Any] | None = None,
        keep_alive: int | None = None,
    ) -> dict[str, Any]:
        self._ensure_circuit_closed(model)
        resolved = await self.resolve_installed_model(model)
        if resolved:
            model = resolved
        if self.resolved and getattr(self.resolved, "is_byo", False):
            from ai_providers.clients import chat_json

            result = await chat_json(
                self.resolved,
                prompt=prompt,
                system=system or "Respond with valid JSON only.",
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            self._record_success(model)
            return result

        payload: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system or "Respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "format": "json",
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        _inject_ollama_runtime(
            payload,
            task_kind=task_kind,
            options=options,
            keep_alive=keep_alive,
        )
        url = f"{self.base_url}/api/chat"
        try:
            async with ollama_http_client(timeout_sec=float(self.timeout_sec)) as client:
                response = await client.post(url, json=payload)
                if response.status_code >= 400:
                    err_body = response.text
                    self._record_failure(model, err_body)
                    raise OllamaClientError(
                        f"Ollama error {response.status_code}",
                        status_code=response.status_code,
                        model=model,
                    )
                data = response.json()
                content = (data.get("message") or {}).get("content") or ""
                self._record_success(model)
                return _extract_json_from_text(content)
        except OllamaClientError:
            raise
        except httpx.RequestError as exc:
            self._record_failure(model, str(exc))
            raise OllamaClientError(f"Ollama connection failed: {exc}", model=model) from exc

    async def chat(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.4,
        max_tokens: int = 2048,
    ) -> str:
        system = next((m["content"] for m in messages if m.get("role") == "system"), "")
        user_parts = [m["content"] for m in messages if m.get("role") == "user"]
        prompt = user_parts[-1] if user_parts else ""
        chunks: list[str] = []
        async for token in self.stream_chat(
            system=system,
            prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        ):
            chunks.append(token)
        return "".join(chunks)

    async def list_models(self) -> list[str]:
        if self.resolved and getattr(self.resolved, "is_byo", False):
            model = getattr(self.resolved, "model", None)
            return [model] if model else []
        url = f"{self.base_url}/api/tags"
        try:
            async with ollama_http_client(timeout_sec=10.0) as client:
                response = await client.get(url)
                if response.status_code >= 400:
                    return []
                data = response.json()
                models = data.get("models") or []
                return [
                    str(m.get("name"))
                    for m in models
                    if isinstance(m, dict) and m.get("name")
                ]
        except httpx.HTTPError:
            return []

    async def generate(
        self,
        *,
        model: str,
        prompt: str,
        images: list[str] | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        """Ollama /api/generate for vision models (llava). images are base64 strings."""
        self._ensure_circuit_closed(model)
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        if images:
            payload["images"] = images
        _inject_ollama_runtime(payload, task_kind=TaskKind.agent_loop)
        url = f"{self.base_url}/api/generate"
        try:
            async with ollama_http_client(timeout_sec=float(self.timeout_sec)) as client:
                response = await client.post(url, json=payload)
                if response.status_code >= 400:
                    err_body = response.text
                    self._record_failure(model, err_body)
                    raise OllamaClientError(
                        f"Ollama generate error {response.status_code}",
                        status_code=response.status_code,
                        model=model,
                    )
                data = response.json()
                self._record_success(model)
                return str(data.get("response") or "").strip()
        except OllamaClientError:
            raise
        except httpx.RequestError as exc:
            self._record_failure(model, str(exc))
            raise OllamaClientError(f"Ollama connection failed: {exc}", model=model) from exc
