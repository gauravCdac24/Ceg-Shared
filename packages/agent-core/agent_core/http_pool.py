"""Shared httpx AsyncClient pool for Ollama (Sprint-7 #8).

Matches ai_providers.http_pool pattern — one client per timeout bucket,
keepalive connections reused across calls. Do not aclose after each request.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx

_clients: dict[float, httpx.AsyncClient] = {}


def get_ollama_http_client(*, timeout_sec: float) -> httpx.AsyncClient:
    """Reuse one AsyncClient per timeout bucket for the process lifetime."""
    key = float(timeout_sec)
    client = _clients.get(key)
    if client is None or client.is_closed:
        client = httpx.AsyncClient(
            timeout=timeout_sec,
            limits=httpx.Limits(max_connections=40, max_keepalive_connections=20),
        )
        _clients[key] = client
    return client


@asynccontextmanager
async def ollama_http_client(*, timeout_sec: float) -> AsyncIterator[httpx.AsyncClient]:
    """Yield pooled client without closing on exit (safe drop-in for AsyncClient)."""
    yield get_ollama_http_client(timeout_sec=timeout_sec)


async def aclose_ollama_http_clients() -> None:
    for key, client in list(_clients.items()):
        try:
            await client.aclose()
        except Exception:
            pass
        _clients.pop(key, None)


def pool_stats_for_tests() -> dict[str, int]:
    return {
        "clients": len(_clients),
        "open": sum(1 for c in _clients.values() if not c.is_closed),
    }
