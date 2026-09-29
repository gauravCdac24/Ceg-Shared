from __future__ import annotations

from agent_core.feedback_memory import format_negative_feedback_value, negative_feedback_key
from agent_core.guardrails import strip_internal_jargon
from agent_core.mutation_preview_gate import commit_ghost_preview
from agent_core.pii_output import redact_pii_from_output


def test_negative_feedback_key_normalizes_intent():
    assert negative_feedback_key("Create Template") == "negative_feedback:create_template"


def test_format_negative_feedback_value_includes_tools():
    text = format_negative_feedback_value(
        comment="Too verbose",
        tools=["canvas_set_background"],
        message_excerpt="Here is your certificate",
    )
    assert "canvas_set_background" in text
    assert "Too verbose" in text


def test_redact_pii_from_output():
    raw = (
        "Contact 9876543210 or aadhaar 1234 5678 9012 or user@example.com. "
        "SSN 123-45-6789. Passport No: A1234567. Card 4111 1111 1111 1111"
    )
    cleaned = redact_pii_from_output(raw)
    assert "9876543210" not in cleaned
    assert "1234 5678 9012" not in cleaned
    assert "user@example.com" not in cleaned
    assert "123-45-6789" not in cleaned
    assert "A1234567" not in cleaned
    assert "4111 1111 1111 1111" not in cleaned
    assert "[ssn redacted]" in cleaned
    assert "[passport redacted]" in cleaned
    assert "[card redacted]" in cleaned


def test_strip_internal_jargon_and_pii():
    raw = "Used canvas_set_background; call me at 9876543210"
    cleaned = strip_internal_jargon(raw)
    assert "canvas_set_background" not in cleaned
    assert "9876543210" not in cleaned


async def test_commit_ghost_preview_success():
    ctx: dict = {"_session_ghost_ids": {"g-1"}}
    out = await commit_ghost_preview("g-1", context=ctx)
    assert '"committed": true' in out
    assert "g-1" not in ctx["_session_ghost_ids"]
