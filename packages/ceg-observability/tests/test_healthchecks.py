"""Tests for healthchecks.io ping helpers."""

from __future__ import annotations

import urllib.error
from unittest.mock import MagicMock, patch

import pytest

from ceg_observability.healthchecks import ping_healthcheck, register_celery_beat_watchdog


def test_ping_healthcheck_empty_url() -> None:
    assert ping_healthcheck("") is False
    assert ping_healthcheck("   ") is False


def test_ping_healthcheck_success() -> None:
    resp = MagicMock()
    resp.status = 200
    resp.__enter__ = MagicMock(return_value=resp)
    resp.__exit__ = MagicMock(return_value=False)
    with patch("urllib.request.urlopen", return_value=resp):
        assert ping_healthcheck("http://localhost:8121/ping/test-uuid") is True


def test_ping_healthcheck_http_error() -> None:
    err = urllib.error.HTTPError("http://x/ping", 500, "fail", {}, None)
    with patch("urllib.request.urlopen", side_effect=err):
        assert ping_healthcheck("http://x/ping") is False


def test_register_celery_beat_watchdog(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HEALTHCHECKS_PING_URL_WORKSHOPOS", "http://localhost:8121/ping/wos")

    celery_app = MagicMock()
    celery_app.conf.beat_schedule = {"existing": {"task": "t", "schedule": 1.0}}
    celery_app.task = lambda *a, **k: (lambda fn: fn)

    task_name = register_celery_beat_watchdog(celery_app, service="workshopos", schedule_seconds=30.0)
    assert task_name == "observability.beat_ping.workshopos"
    assert "workshopos-beat-heartbeat" in celery_app.conf.beat_schedule
    assert celery_app.conf.beat_schedule["workshopos-beat-heartbeat"]["schedule"] == 30.0
