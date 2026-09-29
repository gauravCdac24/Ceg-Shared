from __future__ import annotations

from agent_core.prompt_loader import load_prompt, prompt_sha256, prompts_dir


def test_prompts_dir_exists():
    assert prompts_dir().is_dir()
    assert (prompts_dir() / "cleo_system_v1.md").is_file()


def test_load_cleo_system_prompt():
    text = load_prompt("cleo_system_v1.md")
    assert "Cleo" in text
    assert "Ten explicit rules" in text or "explicit rules" in text.lower()


def test_load_router_prompt():
    text = load_prompt("router_v1.md")
    assert "confidence" in text.lower()
    assert "json" in text.lower()


def test_prompt_sha256_stable():
    text = load_prompt("planner_v1.md")
    assert len(prompt_sha256(text)) == 64


def test_load_prompt_fallback():
    text = load_prompt("nonexistent_prompt_v9.md", fallback="fallback text")
    assert text == "fallback text"


def test_intent_prompt_name_chat():
    from agent_core.prompt_loader import intent_prompt_name
    from agent_core.query_preprocessor import TaskIntent
    from agent_core.turn_router import ConversationState, RoutingDecision

    decision = RoutingDecision(
        path="chat",
        state=ConversationState.chat,
        intent=TaskIntent.conversational,
        confidence=0.95,
        reason="greeting",
        capabilities_text=None,
    )
    assert intent_prompt_name(decision) == "cleo_system_v1.md"


def test_load_product_prompt_meta():
    from agent_core.prompt_loader import load_prompt_meta, parse_prompt_identity

    meta = load_prompt_meta("certstudio/write_text_v1.md")
    assert meta.prompt_id == "certstudio/write_text"
    assert meta.prompt_version == "v1"
    assert "certificate" in meta.text.lower()
    assert parse_prompt_identity("cleo_system_v1.md") == ("cleo_system", "v1")


def test_with_safety_preamble():
    from agent_core.base_system_prompt import SAFETY_PREAMBLE, with_safety_preamble

    out = with_safety_preamble("You grade answers.")
    assert SAFETY_PREAMBLE in out
    assert "You grade answers." in out
    # idempotent
    assert with_safety_preamble(out) == out
