"""Pydantic models for structured profiles and evaluation results."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class RecommendedAction(str, Enum):
    APPROVE = "APPROVE"
    WAITLIST = "WAITLIST"
    REJECT = "REJECT"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class ScreeningJobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class ProfileBasics(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    summary: str | None = None
    profiles: list[dict[str, Any]] = Field(default_factory=list)


class ProfileWork(BaseModel):
    organization: str | None = None
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    summary: str | None = None
    highlights: list[str] = Field(default_factory=list)


class ProfileEducation(BaseModel):
    institution: str | None = None
    area: str | None = None
    study_type: str | None = None
    start_date: str | None = None
    end_date: str | None = None


class ProfileProject(BaseModel):
    name: str | None = None
    description: str | None = None
    url: str | None = None
    technologies: list[str] = Field(default_factory=list)


class StructuredProfile(BaseModel):
    basics: ProfileBasics = Field(default_factory=ProfileBasics)
    skills: list[str] = Field(default_factory=list)
    projects: list[ProfileProject] = Field(default_factory=list)
    work: list[ProfileWork] = Field(default_factory=list)
    education: list[ProfileEducation] = Field(default_factory=list)
    github_username: str | None = None
  # Enrichment payload when github_enrich rubric is used
    github_enrichment: dict[str, Any] | None = None


class EvaluationResult(BaseModel):
    category_scores: dict[str, float] = Field(default_factory=dict)
    evidence: list[str] = Field(default_factory=list)
    final_score: float = 0.0
    recommended_action: RecommendedAction = RecommendedAction.MANUAL_REVIEW
    rationale: str = ""

    @field_validator("recommended_action", mode="before")
    @classmethod
    def _normalize_action(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.upper().strip()
        return v
