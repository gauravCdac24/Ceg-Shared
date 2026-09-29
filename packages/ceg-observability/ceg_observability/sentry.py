"""Optional Sentry SDK init — works with hosted Sentry or self-hosted GlitchTip."""

from __future__ import annotations

import logging
import os
from typing import Any

_log = logging.getLogger(__name__)


def init_sentry_from_env(
    *,
    service_name: str,
    dsn: str | None = None,
    environment: str | None = None,
    release: str | None = None,
    traces_sample_rate: float | None = None,
    extra_integrations: list[Any] | None = None,
) -> bool:
    """Initialize sentry-sdk when ``SENTRY_DSN`` (or ``dsn``) is set. Returns True if active."""
    resolved_dsn = (dsn or os.environ.get("SENTRY_DSN") or "").strip()
    if not resolved_dsn:
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        _log.warning("sentry-sdk not installed — SENTRY_DSN ignored for %s", service_name)
        return False

    integrations: list[Any] = [
        StarletteIntegration(),
        FastApiIntegration(),
    ]
    if extra_integrations:
        integrations.extend(extra_integrations)

    env = environment or os.environ.get("SENTRY_ENVIRONMENT") or "development"
    rel = release or os.environ.get("SENTRY_RELEASE") or service_name
    rate_raw = traces_sample_rate
    if rate_raw is None:
        rate_raw = float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1"))

    try:
        sentry_sdk.init(
            dsn=resolved_dsn,
            environment=env,
            release=rel,
            traces_sample_rate=float(rate_raw),
            integrations=integrations,
        )
    except Exception as exc:
        _log.warning("Sentry init failed for %s: %s", service_name, exc)
        return False

    _log.info("Sentry initialized for %s (environment=%s)", service_name, env)
    return True
