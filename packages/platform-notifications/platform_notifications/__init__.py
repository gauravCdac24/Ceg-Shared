"""Shared platform notification helpers for fleet products."""

from platform_notifications.event import PlatformNotificationEvent, SourceProduct
from platform_notifications.parse import CHANNEL_PLATFORM, parse_platform_event

__all__ = [
    "CHANNEL_PLATFORM",
    "PlatformNotificationEvent",
    "SourceProduct",
    "parse_platform_event",
]
