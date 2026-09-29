"""Tests for Sprint 5 event bus."""
import json
import pytest
from unittest.mock import AsyncMock
from agent_core.event_bus import DomainEvent, publish_event


@pytest.mark.asyncio
async def test_publish_event_calls_redis_publish():
    mock_redis = AsyncMock()
    await publish_event(
        mock_redis,
        DomainEvent.CERTIFICATE_ISSUED,
        {"certificate_id": "cert-123"},
        tenant_id="tenant-abc",
    )
    mock_redis.publish.assert_called_once()
    channel, message = mock_redis.publish.call_args[0]
    assert channel == "domain_events:tenant-abc"
    data = json.loads(message)
    assert data["event"] == "certificate.issued"
    assert data["payload"]["certificate_id"] == "cert-123"
    assert data["tenant_id"] == "tenant-abc"
    assert "published_at" in data


@pytest.mark.asyncio
async def test_domain_event_constants_defined():
    assert DomainEvent.CONTEST_CREATED == "contest.created"
    assert DomainEvent.QUIZ_COMPLETED == "quiz.completed"
    assert DomainEvent.CERTIFICATE_ISSUED == "certificate.issued"
    assert DomainEvent.EVENT_COMPLETED == "event.completed"
    assert DomainEvent.NEWS_PUBLISHED == "news.published"
    assert DomainEvent.WORKSHOP_REGISTERED == "workshop.registered"


@pytest.mark.asyncio
async def test_publish_event_quiz_completed():
    mock_redis = AsyncMock()
    await publish_event(
        mock_redis,
        DomainEvent.QUIZ_COMPLETED,
        {"questions_added": 5},
        tenant_id="tenant-xyz",
    )
    channel, message = mock_redis.publish.call_args[0]
    assert channel == "domain_events:tenant-xyz"
    data = json.loads(message)
    assert data["event"] == "quiz.completed"
    assert data["payload"]["questions_added"] == 5


@pytest.mark.asyncio
async def test_publish_event_workshop_registered():
    mock_redis = AsyncMock()
    await publish_event(
        mock_redis,
        DomainEvent.WORKSHOP_REGISTERED,
        {"booking_id": "bk-001"},
        tenant_id="tenant-ws",
    )
    channel, message = mock_redis.publish.call_args[0]
    data = json.loads(message)
    assert data["event"] == "workshop.registered"
    assert data["payload"]["booking_id"] == "bk-001"
