"""Parse Redis pub/sub payloads into canonical platform notification events."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from platform_notifications.event import PlatformNotificationEvent, SourceProduct

CHANNEL_PLATFORM = "platform:notifications"

_PRODUCT_ALIASES: dict[str, SourceProduct] = {
    "ceg": "ceg",
    "workshopos": "workshopos",
    "quizforge": "quizforge",
    "cert-studio": "cert-studio",
    "cert_studio": "cert-studio",
    "fetchdesk": "fetchdesk",
}


def coerce_source_product(raw: str | None) -> SourceProduct | None:
    if not raw:
        return None
    key = raw.strip().lower().replace("_", "-")
    return _PRODUCT_ALIASES.get(key)


def parse_platform_event(raw: dict[str, Any]) -> PlatformNotificationEvent | None:
    """Accept canonical schema or legacy {product, type, title, body, tenant_id}."""
    if raw.get("source_product") and raw.get("event_type") and raw.get("tenant_id"):
        try:
            return PlatformNotificationEvent.model_validate(raw)
        except Exception:
            return None

    tenant_id = raw.get("tenant_id")
    event_type = raw.get("event_type") or raw.get("type")
    source_product = coerce_source_product(raw.get("source_product") or raw.get("product"))
    if not tenant_id or not event_type or not source_product:
        return None

    payload = dict(raw.get("payload") or {})
    for key in ("title", "body", "deep_link", "job_id", "booking_id", "visit_id"):
        if key in raw and key not in payload:
            payload[key] = raw[key]

    ts = raw.get("timestamp") or raw.get("created_at") or datetime.now(timezone.utc).isoformat()
    return PlatformNotificationEvent(
        event_type=str(event_type),
        source_product=source_product,
        tenant_id=str(tenant_id),
        payload=payload,
        timestamp=str(ts),
    )
