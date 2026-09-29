"""JWT blacklist Redis key helper."""

from __future__ import annotations


def blacklist_key(jti: str) -> str:
    """Canonical Redis key: ``jwt_blacklist:{jti}``."""
    j = (jti or "").strip()
    if not j:
        raise ValueError("jti is required")
    return f"jwt_blacklist:{j}"
