from __future__ import annotations

from agent_core.query_preprocessor import PreprocessedQuery, TaskIntent
from agent_core.shadow_routing import snapshot_from_graph_state
from agent_core.turn_router import (
    ConversationState,
    RoutingDecision,
    routing_decision_from_dict,
    routing_decision_to_dict,
)


def test_routing_decision_round_trip():
    decision = RoutingDecision(
        state=ConversationState.qa,
        intent=TaskIntent.question,
        confidence=0.91,
        path="ask",
        reason="question_intent",
        preprocessed=PreprocessedQuery(
            original="tell me about certs",
            rewritten="tell me about certs",
            intent=TaskIntent.question,
            entities={"topic": "certificates"},
            suggested_mode="ask",
            confidence=0.91,
        ),
    )
    payload = routing_decision_to_dict(decision)
    restored = routing_decision_from_dict(payload)
    assert restored is not None
    assert restored.path == "ask"
    assert restored.intent == TaskIntent.question
    assert restored.state == ConversationState.qa
    assert restored.reason == "question_intent"
    assert restored.confidence == 0.91
    assert restored.preprocessed is not None
    assert restored.preprocessed.entities == {"topic": "certificates"}


def test_snapshot_prefers_routing_decision_over_legacy_scalars():
    state = {
        "routing_decision": routing_decision_to_dict(
            RoutingDecision(
                state=ConversationState.qa,
                intent=TaskIntent.question,
                confidence=0.95,
                path="ask",
                reason="turn_router",
            )
        ),
        "routing_path": "chat",
        "routing_intent": "conversational",
        "routing_state": "chat",
        "routing_reason": "legacy_scalar",
        "intent": "edit",
        "is_greeting": True,
    }
    snap = snapshot_from_graph_state(state)
    assert snap.path == "ask"
    assert snap.intent == "question"
    assert snap.state == "qa"
    assert snap.reason == "turn_router"
