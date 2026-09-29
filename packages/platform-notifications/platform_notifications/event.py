"""Canonical platform notification event schema."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

SourceProduct = Literal["ceg", "workshopos", "quizforge", "cert-studio", "fetchdesk"]


class PlatformNotificationEvent(BaseModel):
    event_type: str
    source_product: SourceProduct
    tenant_id: str
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: str
