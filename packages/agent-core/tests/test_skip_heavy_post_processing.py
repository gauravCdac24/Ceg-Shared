"""Documented behavior of skip_heavy_post_processing (Sprint-2 #2)."""

from __future__ import annotations

from agent_core.agent_runner import skip_heavy_post_processing
from agent_core.query_preprocessor import TaskIntent
from agent_core.turn_router import ConversationState, RoutingDecision


def test_chat_path_skips_heavy_but_docstring_mentions_append_turn():
    doc = skip_heavy_post_processing.__doc__ or ""
    assert "append_turn" in doc
    assert "search_facts" in doc or "retrieval" in doc.lower()

    assert skip_heavy_post_processing(conversational_turn=True, routing_decision=None) is True
    rd = RoutingDecision(
        state=ConversationState.chat,
        intent=TaskIntent.conversational,
        confidence=1.0,
        path="chat",
        reason="test",
    )
    assert skip_heavy_post_processing(conversational_turn=False, routing_decision=rd) is True
