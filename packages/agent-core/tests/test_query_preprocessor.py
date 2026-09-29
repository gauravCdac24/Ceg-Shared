from __future__ import annotations

import pytest

from agent_core.ollama_client import OllamaClient
from agent_core.query_preprocessor import QueryPreprocessor, TaskIntent


class MockPreprocessLlm(OllamaClient):
    def __init__(self, payload: dict) -> None:
        super().__init__(base_url="http://mock")
        self._payload = payload

    async def chat_json(self, **kwargs):
        return self._payload


@pytest.mark.asyncio
async def test_rewrite_vague_query():
    pre = QueryPreprocessor(
        MockPreprocessLlm(
            {
                "rewritten": "Generate five multiple-choice questions about census operations.",
                "intent": "create",
                "entities": {},
                "suggested_mode": "agent",
                "confidence": 0.82,
            }
        ),
        "fast-model",
    )
    result = await pre.preprocess("make some census mcqs")
    assert result.confidence >= 0.5
    assert result.rewritten != result.original
    assert result.intent == TaskIntent.create


@pytest.mark.asyncio
async def test_preprocessor_failure_fallback():
    class BrokenLlm(OllamaClient):
        async def chat_json(self, **kwargs):
            raise RuntimeError("down")

    pre = QueryPreprocessor(BrokenLlm(base_url="http://mock"), "fast-model")
    result = await pre.preprocess("hello")
    assert result.rewritten == "hello"
    assert result.intent == TaskIntent.conversational
    assert result.confidence >= 0.9


@pytest.mark.asyncio
async def test_preprocessor_heuristic_on_llm_failure_for_redesign():
    class BrokenLlm(OllamaClient):
        async def chat_json(self, **kwargs):
            raise RuntimeError("down")

    pre = QueryPreprocessor(BrokenLlm(base_url="http://mock"), "fast-model")
    result = await pre.preprocess("Redesign this certificate with a more professional government style")
    assert result.intent == TaskIntent.edit
    assert result.confidence >= 0.5


@pytest.mark.asyncio
async def test_mode_suggestion_plan():
    pre = QueryPreprocessor(
        MockPreprocessLlm(
            {
                "rewritten": "Plan bulk certificate issuance for 200 recipients.",
                "intent": "bulk",
                "entities": {},
                "suggested_mode": "plan",
                "confidence": 0.9,
            }
        ),
        "fast-model",
    )
    result = await pre.preprocess("how would I bulk issue certs?")
    assert result.suggested_mode == "plan"
