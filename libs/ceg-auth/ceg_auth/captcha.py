"""Server-signed math captcha (Cert Studio HMAC pattern, config-driven)."""

from __future__ import annotations

import hashlib
import hmac
import random
import time
from typing import Any

from ceg_auth.config import AuthProductConfig


def _sign(secret_key: str, challenge_id: str) -> str:
    key = str(secret_key).encode()
    return hmac.new(key, challenge_id.encode(), hashlib.sha256).hexdigest()


def issue_captcha(config: AuthProductConfig) -> dict[str, Any]:
    """Issue a signed math challenge. When captcha disabled, return enabled=False stub."""
    if not config.captcha_required:
        return {"enabled": False, "challenge_id": "", "question": "", "token": ""}
    if not config.secret_key:
        raise ValueError("AuthProductConfig.secret_key required when captcha_required=True")
    a, b = random.randint(1, 9), random.randint(1, 9)
    challenge_id = f"{int(time.time())}:{a}:{b}"
    return {
        "enabled": True,
        "challenge_id": challenge_id,
        "question": f"{a} + {b} = ?",
        "token": _sign(config.secret_key, challenge_id),
    }


def verify_captcha(
    config: AuthProductConfig,
    challenge_id: str | None,
    answer: str | None,
    token: str | None,
) -> bool:
    """Verify answer + HMAC token. Fail-open when ``captcha_required=False``."""
    if not config.captcha_required:
        return True
    if not challenge_id or answer is None or not token:
        return False
    if not config.secret_key:
        return False
    expected_token = _sign(config.secret_key, challenge_id)
    if not hmac.compare_digest(expected_token, str(token)):
        return False
    try:
        ts_s, a_s, b_s = challenge_id.split(":", 2)
        if time.time() - int(ts_s) > int(config.captcha_ttl_sec):
            return False
        expected = int(a_s) + int(b_s)
        return str(expected).strip() == str(answer).strip()
    except (ValueError, TypeError):
        return False
