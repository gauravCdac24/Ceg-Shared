"""Tests for platform_notifications.parse."""

from platform_notifications import parse_platform_event


def test_parse_canonical_event() -> None:
    event = parse_platform_event(
        {
            "event_type": "job.completed",
            "source_product": "fetchdesk",
            "tenant_id": "t1",
            "payload": {"title": "Done"},
            "timestamp": "2026-01-01T00:00:00Z",
        }
    )
    assert event is not None
    assert event.event_type == "job.completed"
    assert event.source_product == "fetchdesk"


def test_parse_legacy_shape() -> None:
    event = parse_platform_event(
        {
            "type": "reminder.sent",
            "product": "workshopos",
            "tenant_id": "t2",
            "title": "Hello",
            "body": "World",
        }
    )
    assert event is not None
    assert event.event_type == "reminder.sent"
    assert event.payload["title"] == "Hello"
