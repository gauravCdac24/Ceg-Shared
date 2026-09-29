"""Shared auth helpers for CEG monorepo products."""

from ceg_auth.config import AuthProductConfig
from ceg_auth.password_policy import PasswordPolicyError, validate_password
from ceg_auth.secrets import parse_secrets, rotate_secrets, signing_secret
from ceg_auth.shared_identity import SharedIdentity, SharedIdentityStore

__all__ = [
    "AuthProductConfig",
    "PasswordPolicyError",
    "SharedIdentity",
    "SharedIdentityStore",
    "parse_secrets",
    "rotate_secrets",
    "signing_secret",
    "validate_password",
]
__version__ = "0.3.0"
