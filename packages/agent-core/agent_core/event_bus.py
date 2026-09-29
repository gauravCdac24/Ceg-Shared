"""
Lightweight cross-product event bus using Redis pub/sub.
Publishers fire-and-forget. Subscribers react asynchronously.
"""
from __future__ import annotations

import asyncio
import json
import structlog
from datetime import datetime, timezone
from typing import Awaitable, Callable

logger = structlog.get_logger()


class DomainEvent:
    CONTEST_CREATED = "contest.created"
    QUIZ_COMPLETED = "quiz.completed"
    CERTIFICATE_ISSUED = "certificate.issued"
    EVENT_COMPLETED = "event.completed"
    NEWS_PUBLISHED = "news.published"
    WORKSHOP_REGISTERED = "workshop.registered"


async def publish_event(
    redis_client,
    event_name: str,
    payload: dict,
    tenant_id: str,
) -> None:
    """Publish a domain event to Redis pub/sub."""
    message = json.dumps(
        {
            "event": event_name,
            "tenant_id": tenant_id,
            "payload": payload,
            "published_at": datetime.now(timezone.utc).isoformat(),
        },
        default=str,
    )
    channel = f"domain_events:{tenant_id}"
    await redis_client.publish(channel, message)
    logger.info("event_bus.published", event_name=event_name, tenant_id=tenant_id)


async def subscribe_events(
    redis_client,
    tenant_id: str,
    handlers: dict[str, Callable[[dict], Awaitable[None]]],
) -> None:
    """Subscribe to domain events and call matching handlers."""
    channel = f"domain_events:{tenant_id}"
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)
    logger.info("event_bus.subscribed", channel=channel, event_names=list(handlers.keys()))

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                data = json.loads(message["data"])
                event_name = data.get("event")
                handler = handlers.get(event_name)
                if handler:
                    await handler(data["payload"])
            except Exception as e:
                logger.error("event_bus.handler_error", error=str(e))
    finally:
        await pubsub.unsubscribe(channel)
