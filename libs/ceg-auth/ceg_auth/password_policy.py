"""Enterprise password policy: 12+ with upper, lower, digit, special."""

from __future__ import annotations

import re

MIN_LENGTH = 12
_REQUIREMENTS = (
    (r"[A-Z]", "one uppercase letter"),
    (r"[a-z]", "one lowercase letter"),
    (r"\d", "one digit"),
    (r"[^A-Za-z0-9]", "one special character"),
)


class PasswordPolicyError(ValueError):
    """Raised when a password fails policy checks."""


def validate_password(password: str, *, min_length: int = MIN_LENGTH) -> None:
    """Raise PasswordPolicyError / ValueError when password does not meet policy."""
    if password is None or len(password) < min_length:
        raise PasswordPolicyError(f"Password must be at least {min_length} characters.")
    for pattern, label in _REQUIREMENTS:
        if not re.search(pattern, password):
            raise PasswordPolicyError(f"Password must contain {label}.")


def password_ok(password: str, *, min_length: int = MIN_LENGTH) -> bool:
    """Return True if password meets policy (no exception)."""
    try:
        validate_password(password, min_length=min_length)
        return True
    except PasswordPolicyError:
        return False
