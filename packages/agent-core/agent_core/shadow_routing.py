"""Log runner vs graph routing disagreements for shadow evaluation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

import structlog

log = structlog.get_logger(__name__)


@dataclass(frozen=True)
class RoutingSnapshot:
    path: str
    intent: str
    state: str
    reason: str


def snapshot_from_decision(decision: Any) -> RoutingSnapshot:
    return RoutingSnapshot(
        path=str(getattr(decision, "path", "") or ""),
        intent=str(
            getattr(getattr(decision, "intent", None), "value", getattr(decision, "intent", "")) or ""
        ),
        state=str(
            getattr(getattr(decision, "state", None), "value", getattr(decision, "state", "")) or ""
        ),
        reason=str(getattr(decision, "reason", "") or ""),
    )


def snapshot_from_graph_state(state: dict[str, Any]) -> RoutingSnapshot:
    from agent_core.turn_router import routing_decision_from_dict

    raw = state.get("routing_decision")
    if isinstance(raw, dict) and raw:
        decision = routing_decision_from_dict(raw)
        if decision is not None:
            return snapshot_from_decision(decision)
        path = str(raw.get("path") or "")
        if path:
            return RoutingSnapshot(
                path=path,
                intent=str(raw.get("intent") or ""),
                state=str(raw.get("state") or path),
                reason=str(raw.get("reason") or "turn_router"),
            )

    intent = str(state.get("intent") or state.get("routing_intent") or "")
    if state.get("is_greeting") or intent == "conversational":
        path = "chat"
        conv_state = "chat"
        reason = "graph_greeting"
    elif state.get("routing_path"):
        path = str(state["routing_path"])
        conv_state = str(state.get("routing_state") or path)
        reason = str(state.get("routing_reason") or "turn_router")
    else:
        path = "agent"
        conv_state = "execute"
        reason = "graph_default"
    return RoutingSnapshot(path=path, intent=intent, state=conv_state, reason=reason)


def log_shadow_disagreement(
    *,
    trace_id: str,
    utterance: str,
    runner: RoutingSnapshot,
    graph: RoutingSnapshot,
) -> bool:
    """Return True when runner and graph routing disagree."""
    disagree = (
        runner.path != graph.path
        or runner.intent != graph.intent
        or runner.state != graph.state
    )
    if disagree:
        log.warning(
            "routing_shadow_disagreement",
            trace_id=trace_id,
            utterance=utterance[:200],
            runner=asdict(runner),
            graph=asdict(graph),
        )
    return disagree
