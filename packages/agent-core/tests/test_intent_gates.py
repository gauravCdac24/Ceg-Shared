from __future__ import annotations

import pytest

from agent_core.intent_gates import (
    cert_create_clarification,
    deterministic_intent,
    extract_cert_create_entities,
    filter_tools_for_intent,
    is_greeting,
    missing_cert_fields_for_create,
    override_misclassified,
    tool_allowed_for_intent,
)
from agent_core.ollama_client import OllamaClient
from agent_core.query_preprocessor import PreprocessedQuery, QueryPreprocessor, TaskIntent


class MockPreprocessLlm(OllamaClient):
    def __init__(self, payload: dict) -> None:
        super().__init__(base_url="http://mock")
        self._payload = payload

    async def chat_json(self, **kwargs):
        return self._payload


@pytest.mark.parametrize(
    ("prompt", "expected"),
    [
        ("hi", TaskIntent.conversational),
        ("Hello!", TaskIntent.conversational),
        ("ok", TaskIntent.conversational),
        ("thanks", TaskIntent.conversational),
        ("edit hero copy", TaskIntent.edit),
        ("Analyze this layout and suggest improvements", TaskIntent.analyze),
        ("Run an accessibility check on this certificate design", TaskIntent.analyze),
    ],
)
def test_deterministic_intent(prompt: str, expected: TaskIntent) -> None:
    result = deterministic_intent(prompt)
    assert result is not None
    assert result.intent == expected
    assert result.confidence >= 0.85


def test_cert_create_intent_requires_cert_studio_context() -> None:
    prompt = "generate a certificate for John Doe"
    assert deterministic_intent(prompt) is None
    result = deterministic_intent(prompt, product_context="cert_studio")
    assert result is not None
    assert result.intent == TaskIntent.create


@pytest.mark.asyncio
async def test_hi_routes_conversational_not_edit() -> None:
    pre = QueryPreprocessor(
        MockPreprocessLlm(
            {
                "rewritten": "Edit the certificate layout",
                "intent": "edit",
                "entities": {},
                "suggested_mode": "agent",
                "confidence": 0.6,
            }
        ),
        "fast-model",
    )
    result = await pre.preprocess("hi")
    assert result.intent == TaskIntent.conversational
    assert result.suggested_mode == "ask"


@pytest.mark.asyncio
async def test_generate_certificate_routes_create() -> None:
    pre = QueryPreprocessor(
        MockPreprocessLlm(
            {
                "rewritten": "Generate certificate",
                "intent": "create",
                "entities": {"name": "John Doe"},
                "suggested_mode": "agent",
                "confidence": 0.9,
            }
        ),
        "fast-model",
    )
    result = await pre.preprocess("generate a certificate for John Doe", product_context="cert_studio")
    assert result.intent == TaskIntent.create


@pytest.mark.asyncio
async def test_edit_hero_copy_routes_edit() -> None:
    pre = QueryPreprocessor(
        MockPreprocessLlm(
            {
                "rewritten": "Edit hero copy",
                "intent": "edit",
                "entities": {},
                "suggested_mode": "agent",
                "confidence": 0.85,
            }
        ),
        "fast-model",
    )
    result = await pre.preprocess("edit hero copy")
    assert result.intent == TaskIntent.edit


@pytest.mark.asyncio
async def test_preprocessor_failure_greeting_fallback() -> None:
    class BrokenLlm(OllamaClient):
        async def chat_json(self, **kwargs):
            raise RuntimeError("down")

    pre = QueryPreprocessor(BrokenLlm(base_url="http://mock"), "fast-model")
    result = await pre.preprocess("hello")
    assert result.intent == TaskIntent.conversational
    assert result.confidence >= 0.9


def test_conversational_blocks_mutation_tools() -> None:
    tools = {
        "handle_improve_intent",
        "preview_certificate",
        "bulk_issue_certificates",
        "get_template_info",
    }
    allowed = filter_tools_for_intent(TaskIntent.conversational, tools)
    assert allowed == set()
    assert not tool_allowed_for_intent(TaskIntent.conversational, "handle_improve_intent")


def test_create_intent_allows_certificate_tools() -> None:
    tools = {
        "handle_improve_intent",
        "preview_certificate",
        "bulk_issue_certificates",
        "get_template_info",
        "import_template_from_file",
    }
    allowed = filter_tools_for_intent(TaskIntent.create, tools)
    assert "preview_certificate" in allowed
    assert "bulk_issue_certificates" in allowed
    assert "import_template_from_file" in allowed


def test_preview_first_restricts_to_read_only_tools() -> None:
    from agent_core.intent_gates import filter_tools_preview_first

    tools = {
        "get_template_info",
        "preview_certificate",
        "handle_improve_intent",
        "bulk_issue_certificates",
    }
    allowed = filter_tools_preview_first(tools)
    assert "get_template_info" in allowed
    assert "preview_certificate" in allowed
    assert "handle_improve_intent" not in allowed
    assert "bulk_issue_certificates" not in allowed


def test_cert_create_plural_without_qty_is_create_not_bulk() -> None:
    result = deterministic_intent("generate certificates", product_context="cert_studio")
    assert result is not None
    assert result.intent == TaskIntent.create


def test_import_template_pdf_routes_create() -> None:
    result = deterministic_intent("import template from pdf upload", product_context="cert_studio")
    assert result is not None
    assert result.intent == TaskIntent.create
    assert result.entities.get("import_template") is True


def test_override_misclassified_greeting() -> None:
    bad = PreprocessedQuery(
        original="hi",
        rewritten="hi",
        intent=TaskIntent.edit,
        confidence=0.55,
    )
    fixed = override_misclassified("hi", bad)
    assert fixed.intent == TaskIntent.conversational


def test_override_misclassified_analyze_not_edit() -> None:
    bad = PreprocessedQuery(
        original="Analyze this layout",
        rewritten="Analyze this layout",
        intent=TaskIntent.edit,
        confidence=0.7,
    )
    fixed = override_misclassified("Analyze this layout and suggest improvements", bad)
    assert fixed.intent == TaskIntent.analyze


def test_analyze_intent_filters_read_only_tools() -> None:
    tools = {
        "handle_improve_intent",
        "check_accessibility",
        "preview_certificate",
        "bulk_issue_certificates",
    }
    allowed = filter_tools_for_intent(TaskIntent.analyze, tools)
    assert "handle_improve_intent" not in allowed
    assert "check_accessibility" in allowed
    assert "preview_certificate" in allowed


def test_incomplete_cert_create_missing_all_fields() -> None:
    prompt = "generate a certificate"
    assert deterministic_intent(prompt, product_context="cert_studio").intent == TaskIntent.create
    missing = missing_cert_fields_for_create(prompt)
    assert missing == ["recipient_name", "course_name", "serial_number"]
    clarify = cert_create_clarification(prompt)
    assert clarify is not None
    assert clarify["needs_clarification"] is True
    assert len(clarify["questions"]) == 3
    assert clarify["event"] == "clarification_needed"


def test_incomplete_cert_create_partial_fields() -> None:
    prompt = "generate a certificate for John Doe"
    entities = extract_cert_create_entities(prompt)
    assert entities.get("recipient_name") == "John Doe"
    missing = missing_cert_fields_for_create(prompt)
    assert "recipient_name" not in missing
    assert "course_name" in missing
    assert "serial_number" in missing
    clarify = cert_create_clarification(prompt)
    assert clarify is not None
    assert len(clarify["missing_fields"]) == 2


def test_complete_cert_create_skips_clarification() -> None:
    prompt = (
        "generate a certificate for John Doe, course Digital India Quiz, "
        "serial MeitY/CeG/CERT/2026/DEMO-0042"
    )
    assert missing_cert_fields_for_create(prompt) == []
    assert cert_create_clarification(prompt) is None


def test_cert_canvas_quick_edits_are_edit_intent() -> None:
    for prompt in (
        "Add a decorative border",
        "Generate a background pattern",
        "Convert to a decorative frame",
        "Suggest layout improvements",
    ):
        result = deterministic_intent(prompt, product_context="cert_studio")
        assert result is not None, prompt
        assert result.intent == TaskIntent.edit, prompt
        assert result.confidence >= 0.9, prompt


@pytest.mark.parametrize(
    "prompt",
    ["hi", "hello", "hey", "thanks", "ok", "okay", "good morning"],
)
def test_is_greeting_short_circuits(prompt: str) -> None:
    assert is_greeting(prompt)
    result = deterministic_intent(prompt)
    assert result is not None
    assert result.intent == TaskIntent.conversational


def test_is_greeting_rejects_design_prompts() -> None:
    assert not is_greeting("improve the layout")
    assert not is_greeting("hi there can you fix the title")
