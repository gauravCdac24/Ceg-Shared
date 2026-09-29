"""Tests for ntfy ops notifications."""

from __future__ import annotations

import urllib.error
from unittest.mock import MagicMock, patch

import pytest

from ceg_observability.ntfy import notify_ntfy, register_celery_failure_notifier


def test_notify_ntfy_empty() -> None:
    assert notify_ntfy("", "msg") is False
    assert notify_ntfy("http://x/t", "") is False


def test_notify_ntfy_success() -> None:
    resp = MagicMock()
    resp.status = 200
    resp.__enter__ = MagicMock(return_value=resp)
    resp.__exit__ = MagicMock(return_value=False)
    with patch("urllib.request.urlopen", return_value=resp) as opener:
        assert notify_ntfy("http://127.0.0.1:8130/t", "hello", title="t") is True
        req = opener.call_args[0][0]
        assert req.get_header("Title") == "t"


def test_resolve_via_register(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NTFY_BASE_URL", "http://127.0.0.1:8130")
    monkeypatch.setenv("NTFY_TOPIC_WORKSHOPOS", "wos-alerts")
    celery_app = MagicMock()
    register_celery_failure_notifier(celery_app, service="workshopos")
    assert hasattr(celery_app, "_ceg_ntfy_failure_hook")
