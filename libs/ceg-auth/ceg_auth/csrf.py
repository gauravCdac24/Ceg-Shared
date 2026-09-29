"""Double-submit CSRF helper (cookie value vs header)."""

from __future__ import annotations

import hmac


def tokens_match(cookie_value: str | None, header_value: str | None) -> bool:
    """Return True when cookie and header CSRF tokens are non-empty and equal."""
    if not cookie_value or not header_value:
        return False
    return hmac.compare_digest(str(cookie_value), str(header_value))
