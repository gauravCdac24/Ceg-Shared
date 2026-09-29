"""Math captcha HMAC tests (Cert Studio pattern, config-driven)."""

from __future__ import annotations

import time

from ceg_auth.captcha import issue_captcha, verify_captcha
from ceg_auth.config import AuthProductConfig


def _cfg(*, captcha_required: bool = True, ttl: int = 600) -> AuthProductConfig:
    return AuthProductConfig(
        product_name="certstudio",
        cookie_prefix="certstudio",
        access_ttl=900,
        refresh_ttl=604800,
        secret_key="captcha-hmac-secret",
        captcha_required=captcha_required,
        captcha_ttl_sec=ttl,
    )


def test_issue_and_verify_captcha() -> None:
    cfg = _cfg(captcha_required=True)
    issued = issue_captcha(cfg)
    assert issued["enabled"] is True
    cid = str(issued["challenge_id"])
    a_s, b_s = cid.split(":", 2)[1:]
    answer = str(int(a_s) + int(b_s))
    assert verify_captcha(cfg, cid, answer, str(issued["token"]))


def test_verify_rejects_wrong_answer() -> None:
    cfg = _cfg(captcha_required=True)
    issued = issue_captcha(cfg)
    cid = str(issued["challenge_id"])
    assert not verify_captcha(cfg, cid, "0", str(issued["token"]))


def test_verify_fail_open_when_disabled() -> None:
    cfg = _cfg(captcha_required=False)
    assert verify_captcha(cfg, None, None, None) is True
    issued = issue_captcha(cfg)
    assert issued["enabled"] is False


def test_verify_rejects_expired_challenge() -> None:
    cfg = _cfg(captcha_required=True, ttl=600)
    old_ts = int(time.time()) - 700
    challenge_id = f"{old_ts}:2:3"
    # Re-sign with same secret via public issue path is random; sign through verify reject path:
    from ceg_auth.captcha import _sign

    token = _sign(cfg.secret_key, challenge_id)
    assert not verify_captcha(cfg, challenge_id, "5", token)
