"""TurnRouter golden matrix — deterministic routing expectations."""



from __future__ import annotations



import pytest

from agent_core.query_preprocessor import TaskIntent

from agent_core.turn_router import ConversationState, TurnRouter





@pytest.mark.asyncio

async def test_greeting_routes_to_chat() -> None:

    decision = await TurnRouter(preprocessor=None).route("hello")

    assert decision.path == "chat"

    assert decision.state == ConversationState.chat

    assert decision.intent == TaskIntent.conversational

    assert decision.confidence >= 0.9





@pytest.mark.asyncio

async def test_hi_routes_to_chat() -> None:

    decision = await TurnRouter(preprocessor=None).route("hi")

    assert decision.path == "chat"

    assert decision.intent == TaskIntent.conversational





@pytest.mark.asyncio

async def test_thanks_routes_to_chat() -> None:

    decision = await TurnRouter(preprocessor=None).route("thanks")

    assert decision.path == "chat"

    assert decision.intent == TaskIntent.conversational





@pytest.mark.asyncio

async def test_capabilities_routes_to_chat_with_text() -> None:

    decision = await TurnRouter(preprocessor=None).route("what can you do?")

    assert decision.path == "chat"

    assert decision.intent == TaskIntent.capabilities

    assert decision.capabilities_text





@pytest.mark.asyncio

async def test_certificate_question_routes_to_ask() -> None:

    decision = await TurnRouter(preprocessor=None).route("tell me about certificates")

    assert decision.path == "ask"

    assert decision.intent == TaskIntent.question





@pytest.mark.asyncio
async def test_create_certificate_routes_to_agent() -> None:
    decision = await TurnRouter(preprocessor=None).route(
        "create certificate",
        ctx={"product_context": "cert_studio"},
    )
    assert decision.path == "agent"
    assert decision.intent == TaskIntent.create


@pytest.mark.asyncio
async def test_bulk_over_100_requires_clarification() -> None:
    decision = await TurnRouter(preprocessor=None).route(
        "generate 500 certificates",
        ctx={"product_context": "cert_studio"},
    )
    assert decision.state == ConversationState.clarification
    assert decision.intent == TaskIntent.bulk_operation


@pytest.mark.asyncio
async def test_low_confidence_create_with_entities_preview_first_agent() -> None:
    from agent_core.query_preprocessor import PreprocessedQuery

    class _Pre:
        async def preprocess(self, msg: str, *, product_context: str = "generic"):
            return PreprocessedQuery(
                original=msg,
                rewritten=msg,
                intent=TaskIntent.create,
                entities={"recipient": "John Doe"},
                suggested_mode="agent",
                confidence=0.55,
            )

    # Avoid deterministic cert-create regex so LLM-classify path still exercised.
    decision = await TurnRouter(preprocessor=_Pre()).route(
        "please draft something for John Doe based on our brief",
        ctx={"product_context": "cert_studio"},
    )
    assert decision.path == "agent"
    assert decision.reason == "preview_first_low_confidence"


@pytest.mark.asyncio
async def test_low_confidence_create_without_entities_stays_ask() -> None:
    from agent_core.query_preprocessor import PreprocessedQuery

    class _Pre:
        async def preprocess(self, msg: str, *, product_context: str = "generic"):
            return PreprocessedQuery(
                original=msg,
                rewritten=msg,
                intent=TaskIntent.create,
                entities={},
                suggested_mode="agent",
                confidence=0.55,
            )

    decision = await TurnRouter(preprocessor=_Pre()).route(
        "please draft something workshop-related for John",
        ctx={"product_context": "cert_studio"},
    )
    assert decision.path == "ask"
    assert decision.reason == "below_tool_floor"


@pytest.mark.asyncio
async def test_plan_mode_requested_routes_to_plan(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENT_PLANNER_ENABLED", "true")
    router = TurnRouter(preprocessor=None)
    decision = await router.route(
        "create certificate",
        ctx={"product_context": "cert_studio", "plan_mode_requested": True},
    )
    assert decision.path == "plan"
    assert decision.state == ConversationState.plan

