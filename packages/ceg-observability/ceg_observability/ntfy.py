"""Self-hosted ntfy push notifications for ops alerting."""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any

_log = logging.getLogger(__name__)

_DEFAULT_TIMEOUT_SEC = 10.0


def _resolve_ntfy_url(service: str) -> str:
    """Build topic URL from NTFY_BASE_URL + NTFY_TOPIC or per-service override."""
    override = os.environ.get(f"NTFY_TOPIC_URL_{service.upper().replace('-', '_')}", "").strip()
    if override:
        return override
    base = os.environ.get("NTFY_BASE_URL", "").strip().rstrip("/")
    topic = os.environ.get(f"NTFY_TOPIC_{service.upper().replace('-', '_')}", "").strip()
    if not topic:
        topic = os.environ.get("NTFY_TOPIC", "ceg-ops-alerts").strip()
    if not base:
        return ""
    return f"{base}/{topic.lstrip('/')}"


def notify_ntfy(
    url: str,
    message: str,
    *,
    title: str = "",
    priority: int = 4,
    tags: str = "",
    timeout: float = _DEFAULT_TIMEOUT_SEC,
) -> bool:
    """POST a message to a self-hosted ntfy topic. No-op when url is empty."""
    target = (url or "").strip()
    if not target or not (message or "").strip():
        return False
    headers = {"Content-Type": "text/plain; charset=utf-8"}
    token = os.environ.get("NTFY_AUTH_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if title:
        headers["Title"] = title[:250]
    if priority:
        headers["Priority"] = str(priority)
    if tags:
        headers["Tags"] = tags
    data = message.strip().encode("utf-8")
    try:
        req = urllib.request.Request(target, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return 200 <= int(resp.status) < 300
    except urllib.error.HTTPError as exc:
        _log.warning("ntfy_http_error url=%s status=%s", target, exc.code)
        return False
    except Exception as exc:
        _log.warning("ntfy_notify_failed url=%s error=%s", target, exc)
        return False


def register_celery_failure_notifier(
    celery_app: Any,
    *,
    service: str,
    critical_queues: tuple[str, ...] | None = None,
) -> None:
    """Connect Celery task_failure signal → ntfy for critical queue failures."""
    from celery.signals import task_failure

    queues = critical_queues or ("ai", "celery", "agent", "default")

    @task_failure.connect(weak=False)
    def _on_task_failure(
        sender: Any = None,
        task_id: str | None = None,
        exception: BaseException | None = None,
        args: tuple[Any, ...] | None = None,
        kwargs: dict[str, Any] | None = None,
        traceback: Any = None,
        einfo: Any = None,
        **extra: Any,
    ) -> None:
        del args, kwargs, traceback, einfo, extra
        url = _resolve_ntfy_url(service)
        if not url:
            return
        task_name = getattr(sender, "name", str(sender))
        queue = ""
        try:
            delivery = getattr(sender, "request", None)
            if delivery is not None:
                queue = str(getattr(delivery, "delivery_info", {}).get("routing_key", ""))
        except Exception:
            pass
        if queues and queue and queue not in queues and not any(q in task_name for q in queues):
            return
        err = str(exception)[:400] if exception else "unknown"
        body = f"{service} task failed\n{task_name}\nid={task_id}\n{err}"
        notify_ntfy(url, body, title=f"Celery fail: {service}", priority=5, tags="warning,skull")

    celery_app._ceg_ntfy_failure_hook = _on_task_failure  # type: ignore[attr-defined]
