"""healthchecks.io ping helpers for Celery beat liveness."""

from __future__ import annotations

import logging
import os
import urllib.error
import urllib.request
from typing import Any

_log = logging.getLogger(__name__)

_DEFAULT_TIMEOUT_SEC = 10.0


def _resolve_ping_url(service: str) -> str:
    """``HEALTHCHECKS_PING_URL_<SERVICE>`` overrides fleet ``HEALTHCHECKS_PING_URL``."""
    key = f"HEALTHCHECKS_PING_URL_{service.upper().replace('-', '_')}"
    url = os.environ.get(key, "").strip()
    if url:
        return url
    return os.environ.get("HEALTHCHECKS_PING_URL", "").strip()


def ping_healthcheck(url: str, *, timeout: float = _DEFAULT_TIMEOUT_SEC) -> bool:
    """GET a healthchecks.io ping URL. No-op when url is empty."""
    target = (url or "").strip()
    if not target:
        return False
    try:
        req = urllib.request.Request(target, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return 200 <= int(resp.status) < 300
    except urllib.error.HTTPError as exc:
        _log.warning("healthcheck_ping_http_error url=%s status=%s", target, exc.code)
        return False
    except Exception as exc:
        _log.warning("healthcheck_ping_failed url=%s error=%s", target, exc)
        return False


def register_celery_beat_watchdog(celery_app: Any, *, service: str, schedule_seconds: float = 60.0) -> str:
    """Register a periodic Celery task that pings healthchecks when beat is alive."""
    task_name = f"observability.beat_ping.{service.replace('-', '_')}"

    @celery_app.task(name=task_name, bind=True)
    def beat_ping_task(self: Any) -> dict[str, Any]:
        url = _resolve_ping_url(service)
        if not url:
            return {"skipped": True, "service": service, "reason": "no_ping_url"}
        ok = ping_healthcheck(url)
        return {"ok": ok, "service": service}

    schedule_key = f"{service.replace('-', '_')}-beat-heartbeat"
    existing = dict(getattr(celery_app.conf, "beat_schedule", None) or {})
    existing[schedule_key] = {
        "task": task_name,
        "schedule": float(schedule_seconds),
    }
    celery_app.conf.beat_schedule = existing
    return task_name
