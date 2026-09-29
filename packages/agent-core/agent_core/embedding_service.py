"""Ollama embedding client for semantic agent memory (Phase 2)."""

from __future__ import annotations

import asyncio

import httpx
import structlog

from agent_core.env_resolver import OLLAMA_EMBED_SEQUENTIAL, resolve_bool_env, resolve_ollama_base_url
from agent_core.model_router import TaskType, route_model

log = structlog.get_logger(__name__)

EMBED_DIM = 768

_embed_semaphore: asyncio.Semaphore | None = None


def _embed_semaphore() -> asyncio.Semaphore | None:
    """Serialize embed calls on tiny/small VMs so chat and embed models do not load together."""
    # Sprint-8 #80: use profile defaults (tiny/small → True) when env unset.
    if not resolve_bool_env(OLLAMA_EMBED_SEQUENTIAL):
        return None
    global _embed_semaphore
    if _embed_semaphore is None:
        _embed_semaphore = asyncio.Semaphore(1)
    return _embed_semaphore


async def embed_text(
    text: str,
    *,
    base_url: str | None = None,
    model: str | None = None,
    timeout_sec: float = 15.0,
) -> list[float] | None:
    """Return embedding vector from Ollama /api/embeddings, or None if unavailable."""
    snippet = (text or "").strip()[:2000]
    if not snippet:
        return None

    sem = _embed_semaphore()
    if sem is not None:
        await sem.acquire()
    try:
        return await _embed_text_inner(
            snippet,
            base_url=base_url,
            model=model,
            timeout_sec=timeout_sec,
        )
    finally:
        if sem is not None:
            sem.release()


async def _embed_text_inner(
    snippet: str,
    *,
    base_url: str | None,
    model: str | None,
    timeout_sec: float,
) -> list[float] | None:
    embed_config = route_model(TaskType.EMBEDDING)
    url_base = (base_url or embed_config.base_url or resolve_ollama_base_url()).rstrip("/")
    embed_model = (model or embed_config.model_name).strip()
    payload = {
        "model": embed_model,
        "prompt": snippet,
        "keep_alive": 0,
    }
    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            r = await client.post(f"{url_base}/api/embeddings", json=payload)
            r.raise_for_status()
            vector = r.json().get("embedding")
            if isinstance(vector, list) and vector:
                return [float(x) for x in vector]
    except Exception as exc:
        log.warning("embed_text_failed", error=str(exc), model=embed_model)
    return None
