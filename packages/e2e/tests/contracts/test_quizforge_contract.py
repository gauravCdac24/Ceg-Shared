"""QuizForge integration API contract tests (ASGI transport, no live server)."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_integration_create_assignment_requires_api_key(qf_client):
    """CeG and other integrators must send X-Api-Key on /v1/integrations/*."""
    resp = await qf_client.post("/v1/integrations/assignments", json={})
    assert resp.status_code == 401
    body = resp.json()
    detail = body.get("detail")
    if isinstance(detail, dict):
        assert detail.get("code") == "UNAUTHORIZED"
    else:
        assert "api" in str(detail).lower() or "unauthorized" in str(detail).lower()


@pytest.mark.asyncio
async def test_integration_embed_token_requires_api_key(qf_client):
    resp = await qf_client.post(
        "/v1/integrations/embed-token",
        json={"assignment_id": "00000000-0000-0000-0000-000000000001", "candidate_email": "a@b.com"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
@pytest.mark.skipif(
    not __import__("os").getenv("QUIZFORGE_CONTRACT_API_KEY"),
    reason="Set QUIZFORGE_CONTRACT_API_KEY to run authenticated contract checks",
)
async def test_integration_create_assignment_accepts_api_key(qf_client):
    import os

    api_key = os.environ["QUIZFORGE_CONTRACT_API_KEY"]
    resp = await qf_client.post(
        "/v1/integrations/assignments",
        json={
            "paper_id": "00000000-0000-0000-0000-000000000099",
            "roster": [{"name": "Contract Test", "email": "contract@example.com"}],
        },
        headers={"X-Api-Key": api_key},
    )
    assert resp.status_code in (200, 201, 422)
