"""Rubric registry, profile extraction, and evaluation."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import structlog

from eligibility_agent.github_enrich import enrich_github
from eligibility_agent.models import (
    EvaluationResult,
    ProfileBasics,
    ProfileEducation,
    ProfileProject,
    ProfileWork,
    RecommendedAction,
    StructuredProfile,
)
from eligibility_agent.ollama_provider import OllamaProvider, wrap_untrusted_user_input
from eligibility_agent.template_manager import TemplateManager

logger = structlog.get_logger(__name__)

_manager = TemplateManager()


@dataclass(frozen=True)
class RubricConfig:
    rubric_id: str
    template: str
    github_enrich: bool = False
    approve_threshold: float = 65.0
    waitlist_threshold: float = 45.0


RUBRIC_REGISTRY: dict[str, RubricConfig] = {
    "workshop_generic": RubricConfig(
        rubric_id="workshop_generic",
        template="rubrics/workshop_generic.jinja",
        github_enrich=False,
        approve_threshold=60.0,
        waitlist_threshold=40.0,
    ),
    "workshop_oss_track": RubricConfig(
        rubric_id="workshop_oss_track",
        template="rubrics/workshop_oss_track.jinja",
        github_enrich=True,
        approve_threshold=65.0,
        waitlist_threshold=45.0,
    ),
    "quizforge_advanced_track": RubricConfig(
        rubric_id="quizforge_advanced_track",
        template="rubrics/quizforge_advanced_track.jinja",
        github_enrich=False,
        approve_threshold=70.0,
        waitlist_threshold=50.0,
    ),
}


def list_rubric_ids() -> list[str]:
    return sorted(RUBRIC_REGISTRY.keys())


def get_rubric_config(rubric_id: str) -> RubricConfig:
    key = (rubric_id or "").strip()
    if key not in RUBRIC_REGISTRY:
        raise ValueError(f"Unknown rubric_id: {rubric_id!r}")
    return RUBRIC_REGISTRY[key]


def extract_structured_profile(
    markdown: str,
    *,
    provider: OllamaProvider | None = None,
) -> StructuredProfile:
    llm = provider or OllamaProvider()
    system = _manager.render("extraction_system.jinja")
    user = _manager.render("extraction_user.jinja", markdown=wrap_untrusted_user_input(markdown))
    raw = llm.chat_json(system=system, user=user)
    return _profile_from_dict(raw)


def evaluate_profile(
    profile: StructuredProfile,
    rubric_id: str,
    *,
    provider: OllamaProvider | None = None,
    event_context: str | None = None,
) -> EvaluationResult:
    cfg = get_rubric_config(rubric_id)
    llm = provider or OllamaProvider()
    profile_json = profile.model_dump(mode="json")
    criteria = _manager.render(
        cfg.template,
        profile=profile,
        profile_json=json.dumps(profile_json, indent=2),
        event_context=event_context or "",
    )
    system = _manager.render("evaluation_system.jinja")
    user = _manager.render(
        "evaluation_user.jinja",
        criteria=wrap_untrusted_user_input(criteria),
        profile_json=wrap_untrusted_user_input(json.dumps(profile_json, indent=2)),
    )
    raw = llm.chat_json(system=system, user=user)
    result = _evaluation_from_dict(raw, cfg)
    _assert_no_pii_scoring(result)
    return result


def run_screening_pipeline(
    pdf_bytes: bytes,
    rubric_id: str,
    *,
    provider: OllamaProvider | None = None,
    event_context: str | None = None,
) -> tuple[StructuredProfile, EvaluationResult]:
    from eligibility_agent.extractor import extract_pdf_to_markdown

    markdown = extract_pdf_to_markdown(pdf_bytes)
    profile = extract_structured_profile(markdown, provider=provider)
    cfg = get_rubric_config(rubric_id)
    if cfg.github_enrich:
        profile = enrich_github(profile, markdown)
    evaluation = evaluate_profile(
        profile,
        rubric_id,
        provider=provider,
        event_context=event_context,
    )
    return profile, evaluation


def _profile_from_dict(raw: dict[str, Any]) -> StructuredProfile:
    basics_raw = raw.get("basics") or {}
    basics = ProfileBasics(
        name=basics_raw.get("name"),
        email=basics_raw.get("email"),
        phone=basics_raw.get("phone"),
        summary=basics_raw.get("summary"),
        profiles=list(basics_raw.get("profiles") or []),
    )
    skills = [str(s) for s in (raw.get("skills") or []) if s]
    projects = [
        ProfileProject(
            name=p.get("name"),
            description=p.get("description"),
            url=p.get("url"),
            technologies=[str(t) for t in (p.get("technologies") or [])],
        )
        for p in (raw.get("projects") or [])
        if isinstance(p, dict)
    ]
    work = [
        ProfileWork(
            organization=w.get("organization") or w.get("name"),
            role=w.get("role") or w.get("position"),
            start_date=w.get("start_date"),
            end_date=w.get("end_date"),
            summary=w.get("summary"),
            highlights=[str(h) for h in (w.get("highlights") or [])],
        )
        for w in (raw.get("work") or [])
        if isinstance(w, dict)
    ]
    education = [
        ProfileEducation(
            institution=e.get("institution"),
            area=e.get("area"),
            study_type=e.get("study_type"),
            start_date=e.get("start_date"),
            end_date=e.get("end_date"),
        )
        for e in (raw.get("education") or [])
        if isinstance(e, dict)
    ]
    return StructuredProfile(
        basics=basics,
        skills=skills,
        projects=projects,
        work=work,
        education=education,
        github_username=raw.get("github_username"),
    )


def _evaluation_from_dict(raw: dict[str, Any], cfg: RubricConfig) -> EvaluationResult:
    scores = raw.get("category_scores") or {}
    if not isinstance(scores, dict):
        scores = {}
    scores = {str(k): float(v) for k, v in scores.items()}
    evidence = [str(e) for e in (raw.get("evidence") or []) if e]
    final_score = float(raw.get("final_score") or sum(scores.values()))
    action_raw = raw.get("recommended_action")
    rationale = str(raw.get("rationale") or raw.get("summary") or "").strip()
    if action_raw:
        try:
            action = RecommendedAction(str(action_raw).upper())
        except ValueError:
            action = _action_from_score(final_score, cfg)
    else:
        action = _action_from_score(final_score, cfg)
    return EvaluationResult(
        category_scores=scores,
        evidence=evidence,
        final_score=final_score,
        recommended_action=action,
        rationale=rationale[:500],
    )


def _action_from_score(score: float, cfg: RubricConfig) -> RecommendedAction:
    if score >= cfg.approve_threshold:
        return RecommendedAction.APPROVE
    if score >= cfg.waitlist_threshold:
        return RecommendedAction.WAITLIST
    if score < cfg.waitlist_threshold - 10:
        return RecommendedAction.REJECT
    return RecommendedAction.MANUAL_REVIEW


_PII_MARKERS = ("gpa", "cgpa", "gender", "college name", "university name", "location score")


def _assert_no_pii_scoring(result: EvaluationResult) -> None:
    blob = json.dumps(result.model_dump(mode="json")).lower()
    for marker in _PII_MARKERS:
        if marker in blob:
            logger.warning("evaluation.pii_marker_detected", marker=marker)
