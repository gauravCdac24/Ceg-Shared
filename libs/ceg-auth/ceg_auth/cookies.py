"""HttpOnly cookie helpers for JWT session transport (Starlette Response)."""

from __future__ import annotations

from starlette.responses import Response

from ceg_auth.config import AuthProductConfig


def access_cookie_name(config: AuthProductConfig) -> str:
    return f"{config.cookie_prefix}_access_token"


def refresh_cookie_name(config: AuthProductConfig) -> str:
    return f"{config.cookie_prefix}_refresh_token"


def _cookie_kwargs(config: AuthProductConfig, max_age: int) -> dict:
    return {
        "httponly": True,
        "secure": bool(config.secure_cookies),
        "samesite": str(config.samesite or "lax").lower(),
        "max_age": max_age,
        "path": "/",
    }


def set_auth_cookies(
    response: Response,
    config: AuthProductConfig,
    *,
    access_token: str,
    refresh_token: str,
) -> None:
    """Replace any prior session cookies before issuing new tokens."""
    clear_auth_cookies(response, config)
    response.set_cookie(
        key=access_cookie_name(config),
        value=access_token,
        **_cookie_kwargs(config, int(config.access_ttl)),
    )
    response.set_cookie(
        key=refresh_cookie_name(config),
        value=refresh_token,
        **_cookie_kwargs(config, int(config.refresh_ttl)),
    )


def clear_auth_cookies(response: Response, config: AuthProductConfig) -> None:
    # Matching attributes so browsers honour deletion under strict SameSite/Secure.
    kw = _cookie_kwargs(config, 0)
    for name in (access_cookie_name(config), refresh_cookie_name(config)):
        response.delete_cookie(
            name,
            path=kw["path"],
            httponly=kw["httponly"],
            secure=kw["secure"],
            samesite=kw["samesite"],
        )
