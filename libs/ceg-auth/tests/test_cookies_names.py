"""Cookie name helpers and set/clear on Starlette Response."""

from __future__ import annotations

from starlette.responses import Response

from ceg_auth.config import AuthProductConfig
from ceg_auth.cookies import (
    access_cookie_name,
    clear_auth_cookies,
    refresh_cookie_name,
    set_auth_cookies,
)


def _cfg(prefix: str = "certstudio") -> AuthProductConfig:
    return AuthProductConfig(
        product_name=prefix,
        cookie_prefix=prefix,
        access_ttl=900,
        refresh_ttl=604800,
        secret_key="x",
        secure_cookies=False,
        samesite="lax",
    )


def test_cookie_names_from_prefix() -> None:
    cfg = _cfg("quizforge")
    assert access_cookie_name(cfg) == "quizforge_access_token"
    assert refresh_cookie_name(cfg) == "quizforge_refresh_token"


def test_set_auth_cookies_writes_both_names() -> None:
    cfg = _cfg("certstudio")
    response = Response()
    set_auth_cookies(response, cfg, access_token="access.jwt", refresh_token="refresh.jwt")
    headers = [v.decode() if isinstance(v, bytes) else v for k, v in response.raw_headers if k.lower() == b"set-cookie"]
    joined = "\n".join(headers)
    assert "certstudio_access_token=access.jwt" in joined
    assert "certstudio_refresh_token=refresh.jwt" in joined
    assert "HttpOnly" in joined
    assert "SameSite=lax" in joined or "SameSite=Lax" in joined


def test_clear_auth_cookies_emits_delete() -> None:
    cfg = _cfg("fetchdesk")
    response = Response()
    clear_auth_cookies(response, cfg)
    headers = [v.decode() if isinstance(v, bytes) else v for k, v in response.raw_headers if k.lower() == b"set-cookie"]
    joined = "\n".join(headers)
    assert "fetchdesk_access_token=" in joined
    assert "fetchdesk_refresh_token=" in joined
