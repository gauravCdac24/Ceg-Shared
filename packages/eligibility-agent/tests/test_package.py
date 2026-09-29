"""Import and rubric render smoke tests."""

from __future__ import annotations

import json

from eligibility_agent import extractor, models
from eligibility_agent.models import StructuredProfile, ProfileBasics
from eligibility_agent.rubric import get_rubric_config, list_rubric_ids
from eligibility_agent.template_manager import TemplateManager


def test_package_imports() -> None:
    assert extractor.extract_pdf_to_markdown is not None
    assert models.StructuredProfile is not None


def test_rubric_templates_render_without_placeholders() -> None:
    mgr = TemplateManager()
    dummy = StructuredProfile(
        basics=ProfileBasics(name="Test User", summary="Python developer"),
        skills=["Python", "FastAPI"],
    )
    profile_json = json.dumps(dummy.model_dump(mode="json"))
    for rubric_id in list_rubric_ids():
        cfg = get_rubric_config(rubric_id)
        out = mgr.render(
            cfg.template,
            profile=dummy,
            profile_json=profile_json,
            event_context="test event",
        )
        assert "{{" not in out, f"Unfilled placeholder in {rubric_id}"
        assert "}}" not in out, f"Unfilled placeholder in {rubric_id}"
