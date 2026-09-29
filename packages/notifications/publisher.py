"""Publish platform notification events to Redis pub/sub."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import structlog

log = structlog.get_logger()

CHANNEL = "platform:notifications"


async def publish_notification(
    redis_client: Any,
    *,
    product: str,
    event_type: str,
    title: str,
    body: str,
    deep_link: str,
    tenant_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    if redis_client is None:
        return
    payload = {
        "product": product,
        "type": event_type,
        "title": title,
        "body": body,
        "deep_link": deep_link,
        "tenant_id": tenant_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **(extra or {}),
    }
    try:
        await redis_client.publish(CHANNEL, json.dumps(payload, ensure_ascii=False))
    except Exception as exc:
        log.warning("notification_publish_failed", err=str(exc), product=product, type=event_type)
