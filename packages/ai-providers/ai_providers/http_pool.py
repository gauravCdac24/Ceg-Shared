"""Shared httpx clients for LLM provider calls (connection reuse)."""

from __future__ import annotations

import httpx

_clients: dict[float, httpx.AsyncClient] = {}


def get_async_http_client(*, timeout_sec: float) -> httpx.AsyncClient:
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


async def aclose_all_http_clients() -> None:
    for key, client in list(_clients.items()):
        try:
            await client.aclose()
        except Exception:
            pass
        _clients.pop(key, None)
