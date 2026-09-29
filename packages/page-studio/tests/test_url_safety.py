"""Tests for craft URL allowlists."""
from __future__ import annotations

from page_studio.url_safety import (
    is_safe_media_url,
    is_safe_nav_url,
    is_safe_open_url,
    is_safe_video_url,
)


def test_nav_blocks_javascript() -> None:
    assert not is_safe_nav_url("javascript:alert(1)")
    assert is_safe_nav_url("https://example.com")
    assert is_safe_nav_url("mailto:hi@example.com")
    assert is_safe_nav_url("/verify")


def test_open_url_stricter_than_nav() -> None:
    assert is_safe_open_url("https://example.com")
    assert not is_safe_open_url("mailto:hi@example.com")
    assert not is_safe_open_url("javascript:alert(1)")


def test_media_allows_data_image_only() -> None:
    assert is_safe_media_url("data:image/png;base64,abc")
    assert not is_safe_media_url("data:text/html,<script>")


def test_video_allowlist() -> None:
    assert is_safe_video_url("https://www.youtube.com/watch?v=abc")
    assert is_safe_video_url("https://cdn.example/video.mp4")
    assert not is_safe_video_url("https://evil.example/page")
