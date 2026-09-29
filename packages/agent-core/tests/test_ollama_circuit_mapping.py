from __future__ import annotations

import pytest

from agent_core.ollama_client import OllamaClient, OllamaClientError


import uuid

import pytest

from agent_core.ollama_client import OllamaClient, OllamaClientError


def test_ensure_circuit_closed_maps_runtime_error_to_ollama_client_error():
    model = f"test-circuit-open-{uuid.uuid4().hex}"
    client = OllamaClient(base_url="http://127.0.0.1:11434")
    for _ in range(5):
        client._record_failure(model)

    with pytest.raises(OllamaClientError, match="circuit breaker"):
        client._ensure_circuit_closed(model)


def test_ensure_circuit_closed_does_not_recurse():
    model = f"test-circuit-closed-{uuid.uuid4().hex}"
    client = OllamaClient(base_url="http://127.0.0.1:11434")
    client._ensure_circuit_closed(model)
