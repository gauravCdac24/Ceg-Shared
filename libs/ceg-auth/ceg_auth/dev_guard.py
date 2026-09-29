"""Fail-closed startup guard: dev OTP / login bypass must be off in deployed envs."""

from __future__ import annotations

_DEPLOYED_ENVS = frozenset({"production", "prod", "staging", "uat"})


def assert_dev_auth_disabled(
    *,
    environment: str,
    dev_otp_active: bool = False,
    allow_dev_login: bool = False,
    allow_dev_login_bypass: bool = False,
    demo_mode: bool = False,
    product: str = "app",
) -> None:
    """Raise RuntimeError when dev auth shortcuts are enabled outside local/dev/test."""
    env = (environment or "").strip().lower()
    if env not in _DEPLOYED_ENVS:
        return
    problems: list[str] = []
    if dev_otp_active:
        problems.append("DEV_OTP / fixed OTP bypass is enabled")
    if allow_dev_login:
        problems.append("ALLOW_DEV_LOGIN is enabled")
    if allow_dev_login_bypass:
        problems.append("ALLOW_DEV_LOGIN_BYPASS is enabled")
    if demo_mode:
        problems.append("DEMO_MODE is enabled")
    if problems:
        joined = "; ".join(problems)
        raise RuntimeError(
            f"SECURITY [{product}]: {joined} in {env!r} environment. "
            "Disable all dev auth shortcuts before deploying to staging/UAT/production."
        )
