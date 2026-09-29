from __future__ import annotations

from agent_core.memory_retrieval import cosine_similarity, dedupe_facts, rank_memories


def test_cosine_similarity_identical():
    assert cosine_similarity([1.0, 0.0], [1.0, 0.0]) == 1.0


def test_dedupe_facts():
    facts = [{"key": "a", "value": "Hello"}, {"key": "b", "value": "hello"}]
    assert len(dedupe_facts(facts)) == 1


def test_rank_memories_prefers_semantic_match():
    candidates = [
        {"key": "1", "value": "census data", "embedding": {"vector": [1.0, 0.0]}, "text_score": 0.1},
        {"key": "2", "value": "unrelated", "embedding": {"vector": [0.0, 1.0]}, "text_score": 0.1},
    ]
    ranked = rank_memories(candidates, query_embedding=[1.0, 0.0])
    assert ranked[0]["value"] == "census data"
