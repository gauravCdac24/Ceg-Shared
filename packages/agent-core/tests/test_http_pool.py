"""Sprint-7 Ollama http pool reuse tests."""

import asyncio

from agent_core.http_pool import (
    aclose_ollama_http_clients,
    get_ollama_http_client,
    ollama_http_client,
    pool_stats_for_tests,
)


def test_pool_reuses_same_client_instance():
    asyncio.run(aclose_ollama_http_clients())
    a = get_ollama_http_client(timeout_sec=30.0)
    b = get_ollama_http_client(timeout_sec=30.0)
    assert a is b
    stats = pool_stats_for_tests()
    assert stats["clients"] == 1
    assert stats["open"] == 1
    asyncio.run(aclose_ollama_http_clients())


def test_ollama_http_client_context_does_not_close():
    async def _run() -> None:
        await aclose_ollama_http_clients()
        async with ollama_http_client(timeout_sec=12.0) as c1:
            async with ollama_http_client(timeout_sec=12.0) as c2:
                assert c1 is c2
                assert not c1.is_closed
        assert not get_ollama_http_client(timeout_sec=12.0).is_closed
        await aclose_ollama_http_clients()

    asyncio.run(_run())
