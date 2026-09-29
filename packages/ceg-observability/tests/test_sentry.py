"""Tests for optional Sentry / GlitchTip init."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from ceg_observability.sentry import init_sentry_from_env


def test_init_sentry_no_dsn() -> None:
    assert init_sentry_from_env(service_name="test-api", dsn="") is False


def test_init_sentry_missing_sdk() -> None:
    import builtins

    real_import = builtins.__import__

    def _block_sentry(name: str, *args: object, **kwargs: object):
        if name == "sentry_sdk" or name.startswith("sentry_sdk."):
            raise ImportError("no sentry")
        return real_import(name, *args, **kwargs)

    with patch("builtins.__import__", side_effect=_block_sentry):
        assert init_sentry_from_env(service_name="test-api", dsn="http://key@glitchtip/ping/1") is False


def test_init_sentry_success() -> None:
    fake_sdk = MagicMock()
    fake_starlette = MagicMock()
    fake_fastapi = MagicMock()
    with patch.dict(
        "sys.modules",
        {
            "sentry_sdk": fake_sdk,
            "sentry_sdk.integrations.starlette": fake_starlette,
            "sentry_sdk.integrations.fastapi": fake_fastapi,
        },
    ):
        fake_starlette.StarletteIntegration = MagicMock(return_value="starlette")
        fake_fastapi.FastApiIntegration = MagicMock(return_value="fastapi")
        ok = init_sentry_from_env(
            service_name="workshopos-api",
            dsn="http://public@localhost:8120/1",
            environment="test",
            traces_sample_rate=0.0,
        )
    assert ok is True
    fake_sdk.init.assert_called_once()
