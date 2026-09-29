"""Ollama-only LLM provider for extraction and evaluation."""

from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx
import structlog

logger = structlog.get_logger(__name__)

DEFAULT_FAST_MODEL = os.environ.get("ELIGIBILITY_OLLAMA_FAST_MODEL", "qwen2.5:3b-instruct-q4_K_M")
DEFAULT_JSON_MODEL = os.environ.get("ELIGIBILITY_OLLAMA_JSON_MODEL", "qwen2.5:3b-instruct-q4_K_M")
USER_INPUT_DELIMITER_START = "--- BEGIN USER INPUT ---"
USER_INPUT_DELIMITER_END = "--- END USER INPUT ---"


def _ollama_base_url() -> str:
    return (
        os.environ.get("ELIGIBILITY_OLLAMA_BASE_URL")
        or os.environ.get("AGENT_OLLAMA_BASE_URL")
        or os.environ.get("OLLAMA_BASE_URL")
        or "http://localhost:11434"
    ).rstrip("/")


def _extract_json_block(text: str) -> dict[str, Any]:
    text = (text or "").strip()
    if not text:
        raise ValueError("Empty LLM response")
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        parsed = json.loads(text[start : end + 1])
        if isinstance(parsed, dict):
            return parsed
    raise ValueError(f"Could not parse JSON from LLM output: {text[:200]}")


def wrap_untrusted_user_input(text: str) -> str:
    cleaned = (text or "").strip()
    escaped = cleaned.replace("--- BEGIN", "[BEGIN]").replace("--- END", "[END]")
    return (
        f"{USER_INPUT_DELIMITER_START}\n"
        f"{escaped}\n"
        f"{USER_INPUT_DELIMITER_END}"
    )


class OllamaProvider:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        fast_model: str | None = None,
        json_model: str | None = None,
        timeout: float = 120.0,
    ) -> None:
        self.base_url = (base_url or _ollama_base_url()).rstrip("/")
        self.fast_model = fast_model or DEFAULT_FAST_MODEL
        self.json_model = json_model or DEFAULT_JSON_MODEL
        self.timeout = timeout

    def chat_json(
        self,
        *,
        system: str,
        user: str,
        model: str | None = None,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        model_name = model or self.json_model
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
            "format": "json",
            "options": {"temperature": temperature},
        }
        url = f"{self.base_url}/api/chat"
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        content = (data.get("message") or {}).get("content") or ""
        try:
            return _extract_json_block(content)
        except ValueError:
            # Some Ollama builds ignore format=json; retry parse
            return _extract_json_block(content)
