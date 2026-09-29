"""VM-profile capacity gate for heavy agent features (Sprint-7 #35 / #3).

LangGraph and multi-agent remain default OFF. Enabling them requires
OLLAMA_VM_PROFILE=standard (or higher). tiny/small refuse at startup.
"""

from __future__ import annotations

import os

from agent_core.env_resolver import get_vm_profile

_HEAVY_PROFILES = frozenset({"standard"})


class CapacityGateError(RuntimeError):
    """Raised when heavy AI flags conflict with VM profile."""


def _flag_on(name: str, *, settings_val: bool | None = None) -> bool:
    if settings_val is True:
        return True
    if settings_val is False:
        # Explicit false wins over env unless env forces true — settings already resolved.
        return False
    raw = (os.getenv(name) or "").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def assert_heavy_agent_capacity(
    *,
    use_langgraph: bool | None = None,
    enable_multi_agent: bool | None = None,
    profile: str | None = None,
) -> None:
    """Fail closed if LangGraph/multi-agent enabled on tiny/small profile.

    Call from product startup. Does nothing when both flags are off.
    """
    lg = _flag_on("USE_LANGGRAPH_AGENT", settings_val=use_langgraph)
    ma = _flag_on("ENABLE_MULTI_AGENT", settings_val=enable_multi_agent)
    if not lg and not ma:
        return
    active = (profile or get_vm_profile()).strip().lower()
    if active in _HEAVY_PROFILES:
        return
    flags = []
    if lg:
        flags.append("USE_LANGGRAPH_AGENT=true")
    if ma:
        flags.append("ENABLE_MULTI_AGENT=true")
    raise CapacityGateError(
        "Capacity gate refused heavy agent flags on "
        f"OLLAMA_VM_PROFILE={active!r}. Set profile to 'standard' (or disable "
        f"{', '.join(flags)}). Defaults stay OFF — Sprint-7 #35."
    )
