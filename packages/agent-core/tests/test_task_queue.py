"""Tests for agent queue mode defaults (B-H07)."""

from __future__ import annotations

import os

import pytest

from agent_core.task_queue import is_agent_queue_mode


def test_agent_queue_mode_explicit_true() -> None:
    assert is_agent_queue_mode("true")


def test_agent_queue_mode_explicit_false() -> None:
    assert not is_agent_queue_mode("false")


def test_agent_queue_mode_production_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENT_QUEUE_MODE", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    assert is_agent_queue_mode()


def test_agent_queue_mode_development_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENT_QUEUE_MODE", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")
    assert not is_agent_queue_mode()


def test_assert_sync_stream_allowed_raises_in_queue_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    from fastapi import HTTPException

    from agent_core.task_queue import assert_sync_stream_allowed

    monkeypatch.setenv("AGENT_QUEUE_MODE", "true")
    with pytest.raises(HTTPException) as exc:
        assert_sync_stream_allowed()
    assert exc.value.status_code == 409
    assert "agent_queue_mode" in str(exc.value.detail)
