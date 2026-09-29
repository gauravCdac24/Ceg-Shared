"""Have I Been Pwned (HIBP) k-anonymity password check.

Uses SHA-1 range query: send only the first 5 hex chars of the hash.
Fail-open on timeout / network / HTTP errors — registration must not block.
Reject when the remaining suffix appears in the range response.
"""

from __future__ import annotations

import hashlib
import logging
import urllib.error
import urllib.request
from typing import Callable

_log = logging.getLogger("ceg_auth.hibp")

HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/{prefix}"
DEFAULT_TIMEOUT_SEC = 3.0


def _sha1_hex(password: str) -> str:
    return hashlib.sha1(password.encode("utf-8")).hexdigest().upper()


def _default_fetch(url: str, timeout: float) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "ceg-auth-hibp/0.1", "Add-Padding": "true"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 — HIBP HTTPS only
        return resp.read().decode("utf-8", errors="replace")


def is_password_pwned(
    password: str,
    *,
    timeout: float = DEFAULT_TIMEOUT_SEC,
    fetch: Callable[[str, float], str] | None = None,
) -> bool:
    """Return True if password appears in HIBP; False if safe or on fail-open.

    ``fetch(url, timeout) -> body`` may be injected for tests.
    """
    if not password:
        return False
    digest = _sha1_hex(password)
    prefix, suffix = digest[:5], digest[5:]
    url = HIBP_RANGE_URL.format(prefix=prefix)
    getter = fetch or _default_fetch
    try:
        body = getter(url, timeout)
    except Exception as exc:  # noqa: BLE001 — fail-open on any transport/HTTP error
        _log.warning("hibp_check_fail_open", extra={"error": type(exc).__name__})
        return False

    for line in body.splitlines():
        parts = line.strip().split(":")
        if not parts:
            continue
        if parts[0].strip().upper() == suffix:
            return True
    return False


def assert_password_not_pwned(
    password: str,
    *,
    timeout: float = DEFAULT_TIMEOUT_SEC,
    fetch: Callable[[str, float], str] | None = None,
) -> None:
    """Raise ValueError if password is known-breached. Fail-open skips raise."""
    if is_password_pwned(password, timeout=timeout, fetch=fetch):
        raise ValueError("Password appears in a known data breach; choose a different password.")
