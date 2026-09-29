"""Optional GitHub profile enrichment (enabled per rubric)."""

from __future__ import annotations

import os
import re
from typing import Any

import httpx
import structlog

from eligibility_agent.models import StructuredProfile

logger = structlog.get_logger(__name__)


def _github_token() -> str | None:
    raw = os.environ.get("GITHUB_TOKEN") or os.environ.get("ELIGIBILITY_GITHUB_TOKEN")
    return raw.strip() if raw else None


def infer_github_username(profile: StructuredProfile, markdown: str) -> str | None:
    if profile.github_username:
        return profile.github_username.strip().lstrip("@")
    for link in profile.basics.profiles or []:
        url = str(link.get("url") or "")
        m = re.search(r"github\.com/([A-Za-z0-9_-]+)", url, re.I)
        if m:
            return m.group(1)
    m = re.search(r"github\.com/([A-Za-z0-9_-]+)", markdown, re.I)
    return m.group(1) if m else None


def enrich_github(profile: StructuredProfile, markdown: str) -> StructuredProfile:
    username = infer_github_username(profile, markdown)
    if not username:
        return profile
    headers: dict[str, str] = {"Accept": "application/vnd.github+json"}
    token = _github_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        with httpx.Client(timeout=20.0) as client:
            user_resp = client.get(f"https://api.github.com/users/{username}", headers=headers)
            if user_resp.status_code != 200:
                return profile
            user_data = user_resp.json()
            repos_resp = client.get(
                f"https://api.github.com/users/{username}/repos",
                headers=headers,
                params={"sort": "updated", "per_page": 10},
            )
            repos = repos_resp.json() if repos_resp.status_code == 200 else []
    except Exception as exc:  # noqa: BLE001
        logger.warning("github.enrich_failed", username=username, error=str(exc))
        return profile

    enrichment: dict[str, Any] = {
        "username": username,
        "public_repos": user_data.get("public_repos"),
        "bio": user_data.get("bio"),
        "top_repos": [
            {
                "name": r.get("name"),
                "description": r.get("description"),
                "stars": r.get("stargazers_count"),
                "language": r.get("language"),
                "fork": r.get("fork"),
            }
            for r in repos[:7]
            if isinstance(r, dict)
        ],
    }
    return profile.model_copy(update={"github_username": username, "github_enrichment": enrichment})
