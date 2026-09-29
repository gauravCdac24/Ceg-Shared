"""Map agent stream exceptions to user-safe, actionable SSE error text."""

from __future__ import annotations

import json
import re

import httpx

from agent_core.ollama_client import OllamaClientError

_MODEL_MISSING_RE = re.compile(
    r"model\s+['\"]?([\w.\-:]+)['\"]?\s+not found|pull.*model|404",
    re.IGNORECASE,
)


def _pull_hint(model: str | None) -> str:
    name = (model or "llama3.2:3b").strip() or "llama3.2:3b"
    return f" On the server run: ollama pull {name}"


def format_ollama_client_error(exc: OllamaClientError) -> str:
    msg = str(exc)
    model = getattr(exc, "model", None)
    status = getattr(exc, "status_code", None)

    if status == 404 or _MODEL_MISSING_RE.search(msg):
        return (
            f"Ollama model '{model or 'configured model'}' is not installed."
            + _pull_hint(model)
        )
    if "connection failed" in msg.lower() or "connect" in msg.lower():
        return "AI service is offline. Check that Ollama is running, then try again."
    if "circuit breaker" in msg.lower():
        return "AI service is cooling down after errors. Wait about 60 seconds, then retry."
    if "timeout" in msg.lower() or "timed out" in msg.lower():
        return "AI is taking too long (cold model load). Wait ~30s and try again."
    return msg or "AI service error. Check Ollama status and try again."


def format_agent_stream_error(exc: BaseException) -> str:
    """Turn any stream exception into actionable UI copy (never bare 'stopped unexpectedly')."""
    if isinstance(exc, OllamaClientError):
        return format_ollama_client_error(exc)

    if isinstance(exc, TimeoutError):
        return "AI is taking too long. Try a shorter prompt or wait for Ollama to finish loading."

    if isinstance(exc, (ConnectionRefusedError, httpx.ConnectError)):
        return "AI service is offline. Start Ollama and try again."

    if isinstance(exc, httpx.TimeoutException):
        return "AI request timed out during model load. Wait ~30s and try again."

    if isinstance(exc, RuntimeError) and "circuit breaker" in str(exc).lower():
        return "AI service is cooling down after errors. Wait about 60 seconds, then retry."


    try:
        from sqlalchemy.exc import DBAPIError

        if isinstance(exc, DBAPIError) and "InFailedSQLTransaction" in str(exc):
            return (
                "Cleo memory search failed (database transaction). "
                "Retry once; if it persists, ask ops to run agent memory pgvector migration."
            )
    except ImportError:
        pass

    if isinstance(exc, json.JSONDecodeError):
        return "AI returned an invalid response. Check Ollama logs and model compatibility."

    msg = str(exc).strip()
    if msg and len(msg) < 240 and not msg.startswith("Traceback"):
        return msg

    return (
        "The AI agent stopped unexpectedly. "
        "Check Ollama (/api/tags), confirm the model is pulled, then retry."
    )
