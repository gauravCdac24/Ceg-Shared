"""Per-product auth configuration."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AuthProductConfig:
    """Config-driven auth settings shared across monorepo products.

    ``secret_key`` is used for HMAC captcha (and optionally HS256 JWT).
    ``cookie_prefix`` yields names ``{prefix}_access_token`` / ``{prefix}_refresh_token``.
    """

    product_name: str
    cookie_prefix: str
    access_ttl: int  # seconds
    refresh_ttl: int  # seconds
    samesite: str = "lax"
    secret_key: str = ""
    secure_cookies: bool = True
    captcha_required: bool = False
    captcha_ttl_sec: int = 600
    # Redis key product segment, e.g. "workshopos" → workshopos:login:otp:{id}
    redis_product_prefix: str | None = None
    jwt_algorithm: str = "HS256"  # HS256 or RS256
    # RS256: PEM strings; HS256 uses secret_key
    jwt_private_key: str | None = None
    jwt_public_key: str | None = None

    def redis_prefix(self) -> str:
        return (self.redis_product_prefix or self.product_name).strip().lower()
