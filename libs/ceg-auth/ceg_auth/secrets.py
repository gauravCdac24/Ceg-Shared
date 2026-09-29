"""Versioned signing secrets — sign with newest, verify against any.

Pattern mirrors Better Auth BETTER_AUTH_SECRETS: comma-separated or list of
secrets newest-first. Supports dual-verify windows during rotation.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SecretVersion:
    """One versioned key. ``kid`` is optional metadata for JWT headers."""

    value: str
    kid: str | None = None


def parse_secrets(raw: str | list[str] | None, *, sep: str = ",") -> list[str]:
    """Parse env-style secret list. Newest first. Empty entries dropped."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return [s.strip() for s in raw if str(s).strip()]
    return [p.strip() for p in str(raw).split(sep) if p.strip()]


def signing_secret(secrets: list[str] | list[SecretVersion]) -> str:
    """Return newest secret for signing. Raises if empty."""
    if not secrets:
        raise ValueError("secret list is empty — cannot sign")
    first = secrets[0]
    return first.value if isinstance(first, SecretVersion) else str(first)


def verification_secrets(secrets: list[str] | list[SecretVersion]) -> list[str]:
    """All secrets acceptable for verify (newest first)."""
    out: list[str] = []
    for s in secrets:
        out.append(s.value if isinstance(s, SecretVersion) else str(s))
    return out


def rotate_secrets(
    current: list[str] | list[SecretVersion],
    new_secret: str,
    *,
    keep: int = 2,
) -> list[str]:
    """Prepend ``new_secret`` and keep at most ``keep`` prior versions (including new).

    Example keep=2: [new, previous] — dual-verify window during cutover.
    """
    if not new_secret.strip():
        raise ValueError("new_secret must be non-empty")
    existing = verification_secrets(current)
    # Drop if already head
    if existing and existing[0] == new_secret:
        return existing[:keep]
    rotated = [new_secret] + [s for s in existing if s != new_secret]
    return rotated[: max(1, keep)]


def secrets_env_value(secrets: list[str], *, sep: str = ",") -> str:
    """Serialize for env storage (newest first)."""
    return sep.join(secrets)
