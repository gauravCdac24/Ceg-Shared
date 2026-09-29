"""Shared Keycloak shadow JWT validator (Wave E).

This module is the canonical implementation that gets synced into each
backend's ``app/security/`` (or ``app/services/``) by
``scripts/sync_keycloak_validator.py``. Treat this file as the source of
truth; do NOT edit the per-backend copies by hand.

Why a shared module: the 4 remaining backends (WorkshopOS, QuizForge,
FetchDesk, CeG-core) all need the same:

- Lazy JWKS client with a 10-minute key cache.
- Configurable issuer + audience per service.
- Realm-role → product-role mapping (each product picks its prefix).
- Emergency local-login flag (rollback path).
- Service-account token verification (for inter-service calls; replaces
  the X-Api-Key model).

Drift between products is exactly the bug the council called out as the
biggest Wave-D/E risk. One module, synced.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any, Callable, Optional, Sequence

import jwt
from jwt import PyJWKClient, PyJWTError

log = logging.getLogger("ceg.keycloak_validator")


@dataclass(frozen=True)
class KeycloakConfig:
    issuer: str
    audience: str
    jwks_url: str
    role_prefix: str

    @classmethod
    def from_env(cls, *, role_prefix: str, audience_env: str = "KEYCLOAK_AUDIENCE", default_audience: str = "") -> Optional["KeycloakConfig"]:
        issuer = os.getenv("KEYCLOAK_ISSUER", "").strip()
        audience = os.getenv(audience_env, "").strip() or default_audience
        if not issuer or not audience:
            return None
        jwks_url = f"{issuer.rstrip('/')}/protocol/openid-connect/certs"
        return cls(issuer=issuer, audience=audience, jwks_url=jwks_url, role_prefix=role_prefix)


_JWKS_CACHE: dict[str, PyJWKClient] = {}


def _jwks_client(cfg: KeycloakConfig) -> PyJWKClient:
    client = _JWKS_CACHE.get(cfg.jwks_url)
    if client is None:
        client = PyJWKClient(cfg.jwks_url, cache_keys=True, lifespan=600)
        _JWKS_CACHE[cfg.jwks_url] = client
    return client


def looks_like_keycloak_token(token: str, cfg: KeycloakConfig) -> bool:
    """Cheap iss-claim check without signature verification.

    Used to route a Bearer token to either the Keycloak validator or the
    legacy local one. A token that *claims* to be Keycloak-issued but
    fails the JWKS check is NOT silently retried against the local secret —
    that would let a forger past the gate.
    """
    try:
        unverified = jwt.decode(token, options={"verify_signature": False, "verify_aud": False, "verify_exp": False})
    except PyJWTError:
        return False
    iss = unverified.get("iss")
    return isinstance(iss, str) and iss.rstrip("/") == cfg.issuer.rstrip("/")


def decode_keycloak_user_token(token: str, cfg: KeycloakConfig) -> Optional[dict[str, Any]]:
    """Verify a USER token. Returns a normalized payload or None.

    Normalized shape:

        {
          "sub": str,            # Keycloak user id
          "kc_sub": str,         # same — used by user-provisioning code
          "email": Optional[str],
          "role": str,           # first matching `<role_prefix>:*` realm role, else "viewer"
          "purpose": "access",
          "iss": str,
          "aud": str,
          "preferred_username": Optional[str],
          "is_service_account": False,
        }
    """
    try:
        signing_key = _jwks_client(cfg).get_signing_key_from_jwt(token).key
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256", "ES256"],
            audience=cfg.audience,
            issuer=cfg.issuer.rstrip("/"),
            options={"require": ["exp", "iat", "iss", "sub"]},
        )
    except PyJWTError as exc:
        log.debug("keycloak user token rejected: %s", exc)
        return None

    realm_roles = (payload.get("realm_access") or {}).get("roles") or []
    role = "viewer"
    for r in realm_roles:
        if isinstance(r, str) and r.startswith(cfg.role_prefix):
            role = r.split(":", 2)[-1]
            break

    sub = str(payload.get("sub"))
    return {
        "sub": sub,
        "kc_sub": sub,
        "email": payload.get("email"),
        "role": role,
        "purpose": "access",
        "iss": payload.get("iss"),
        "aud": payload.get("aud"),
        "preferred_username": payload.get("preferred_username"),
        "is_service_account": False,
    }


def decode_keycloak_service_token(
    token: str,
    cfg: KeycloakConfig,
    *,
    allowed_azp: Sequence[str],
) -> Optional[dict[str, Any]]:
    """Verify a SERVICE-ACCOUNT token (replaces X-Api-Key).

    Wave E retires the shared ``X-Api-Key`` env-var pair. Service-to-service
    calls now use a Keycloak ``client_credentials`` token and the validator
    enforces ``azp`` (authorized party) against an allow-list of client_ids.
    """
    try:
        signing_key = _jwks_client(cfg).get_signing_key_from_jwt(token).key
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256", "ES256"],
            audience=cfg.audience,
            issuer=cfg.issuer.rstrip("/"),
            options={"require": ["exp", "iat", "iss", "azp"]},
        )
    except PyJWTError as exc:
        log.debug("keycloak service token rejected: %s", exc)
        return None
    azp = payload.get("azp")
    if azp not in allowed_azp:
        log.warning("keycloak service token rejected: azp=%r not in allowlist", azp)
        return None
    return {
        "azp": azp,
        "scope": payload.get("scope"),
        "iss": payload.get("iss"),
        "aud": payload.get("aud"),
        "purpose": "service",
        "is_service_account": True,
    }


def emergency_local_login_enabled() -> bool:
    return os.getenv("EMERGENCY_LOCAL_LOGIN_ENABLED", "").lower() in {"1", "true", "yes", "on"}


def make_dual_decoder(
    cfg: Optional[KeycloakConfig],
    local_decoder: Callable[[str], Optional[dict[str, Any]]],
    *,
    allowed_azp: Sequence[str] = (),
) -> Callable[[str], Optional[dict[str, Any]]]:
    """Build a token decoder closure that tries Keycloak first, then local.

    Usage in a backend:

        from app.security.local_jwt import decode_local
        from shared_keycloak.keycloak_validator import KeycloakConfig, make_dual_decoder

        _decode = make_dual_decoder(
            KeycloakConfig.from_env(role_prefix="product:workshopos:", default_audience="workshopos-backend"),
            decode_local,
            allowed_azp=("workshopos-svc", "ceg-core-svc"),
        )
    """

    def _decode(token: str) -> Optional[dict[str, Any]]:
        if emergency_local_login_enabled():
            return local_decoder(token)
        if cfg is None:
            return local_decoder(token)
        if not looks_like_keycloak_token(token, cfg):
            return local_decoder(token)
        # Try user token first; fall back to service token.
        kc_user = decode_keycloak_user_token(token, cfg)
        if kc_user is not None:
            return kc_user
        if allowed_azp:
            return decode_keycloak_service_token(token, cfg, allowed_azp=tuple(allowed_azp))
        return None

    return _decode
