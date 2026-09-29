"""HTTP client for self-hosted MinerU document parsing API."""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any

_log = logging.getLogger(__name__)

_DEFAULT_TIMEOUT = float(os.environ.get("MINERU_TIMEOUT_SEC", "120"))
_MIN_CHARS = int(os.environ.get("MINERU_MIN_TEXT_CHARS", "80"))


def mineru_api_url() -> str:
    return os.environ.get("MINERU_API_URL", "").strip().rstrip("/")


def mineru_enabled() -> bool:
    return bool(mineru_api_url())


def should_try_mineru(pypdf_text: str) -> bool:
    if not mineru_enabled():
        return False
    return len((pypdf_text or "").strip()) < _MIN_CHARS


def parse_pdf_bytes(data: bytes, *, filename: str = "document.pdf") -> str:
    """
    POST PDF to MinerU ``/file_parse`` (sync). Returns markdown/text or '' on failure.
    """
    base = mineru_api_url()
    if not base or not data:
        return ""
    url = f"{base}/file_parse"
    boundary = "----cegmineruboundary"
    body_parts: list[bytes] = []
    disposition = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: application/pdf\r\n\r\n"
    ).encode()
    body_parts.append(disposition)
    body_parts.append(data)
    body_parts.append(f"\r\n--{boundary}--\r\n".encode())
    payload = b"".join(body_parts)
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }
    try:
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=_DEFAULT_TIMEOUT) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        _log.warning("mineru_http_error status=%s", exc.code)
        return ""
    except Exception as exc:
        _log.warning("mineru_request_failed error=%s", exc)
        return ""
    return _extract_text_from_response(raw)


def _extract_text_from_response(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        return ""
    if raw.startswith("{"):
        try:
            data: dict[str, Any] = json.loads(raw)
        except json.JSONDecodeError:
            return raw[:12000]
        for key in ("md_content", "markdown", "text", "content"):
            val = data.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()[:12000]
        results = data.get("results")
        if isinstance(results, list) and results:
            first = results[0]
            if isinstance(first, dict):
                for key in ("md_content", "markdown", "text"):
                    val = first.get(key)
                    if isinstance(val, str) and val.strip():
                        return val.strip()[:12000]
        return raw[:12000]
    return raw[:12000]
