"""CEG AI Platform — Canonical Environment Variable Schema.

All products MUST use these canonical names. Per-product aliases are supported
via resolve_env() which checks deprecated names with a warning.
"""

from __future__ import annotations

import os

import structlog

log = structlog.get_logger(__name__)

# ── Canonical names ───────────────────────────────────────────────────────────

# Ollama
AGENT_OLLAMA_BASE_URL = "AGENT_OLLAMA_BASE_URL"      # default: http://localhost:11434
OLLAMA_CHEAP_MODEL = "OLLAMA_CHEAP_MODEL"              # default: qwen2.5:7b
OLLAMA_CAPABLE_MODEL = "OLLAMA_CAPABLE_MODEL"          # default: qwen2.5:14b
OLLAMA_EMBEDDING_MODEL = "OLLAMA_EMBEDDING_MODEL"      # default: nomic-embed-text
OLLAMA_VISION_MODEL = "OLLAMA_VISION_MODEL"            # default: llava:13b
OLLAMA_JSON_MODEL = "OLLAMA_JSON_MODEL"                # default: same as cheap model

# VM / Ollama runtime tuning (see docs/agent-platform/vm-tuning.md)
OLLAMA_VM_PROFILE = "OLLAMA_VM_PROFILE"                # tiny | small | standard (default standard)
OLLAMA_NUM_CTX = "OLLAMA_NUM_CTX"                      # default context cap for chat (profile-aware)
OLLAMA_NUM_CTX_FAST = "OLLAMA_NUM_CTX_FAST"            # fast/json routing context cap
OLLAMA_KEEP_ALIVE = "OLLAMA_KEEP_ALIVE"                # seconds; 0 = unload after each request
OLLAMA_FALLBACK_CHAIN = "OLLAMA_FALLBACK_CHAIN"        # comma-separated model fallback names
OLLAMA_EMBED_SEQUENTIAL = "OLLAMA_EMBED_SEQUENTIAL"    # serialize embed vs chat on tiny VMs

# Agent concurrency / memory budgets
AGENT_MAX_CONCURRENT_TURNS = "AGENT_MAX_CONCURRENT_TURNS"
AGENT_MAX_HISTORY_TURNS = "AGENT_MAX_HISTORY_TURNS"
AGENT_PROMPT_TOKEN_BUDGET = "AGENT_PROMPT_TOKEN_BUDGET"
AGENT_OOM_COOLDOWN_SEC = "AGENT_OOM_COOLDOWN_SEC"
AGENT_TURN_QUEUE_TIMEOUT_SEC = "AGENT_TURN_QUEUE_TIMEOUT_SEC"
AGENT_REFLECTION_ENABLED = "AGENT_REFLECTION_ENABLED"
AGENT_PLANNER_ENABLED = "AGENT_PLANNER_ENABLED"
AGENT_CELERY_TASK_TIMEOUT_SEC = "AGENT_CELERY_TASK_TIMEOUT_SEC"
CEG_CHILD_AGENT_TIMEOUT_SEC = "CEG_CHILD_AGENT_TIMEOUT_SEC"
MCP_TOOL_TIMEOUT_SEC = "MCP_TOOL_TIMEOUT_SEC"

# MCP
CEG_MCP_URL = "CEG_MCP_URL"                            # default: http://localhost:8001
WORKSHOPOS_MCP_URL = "WORKSHOPOS_MCP_URL"              # default: http://localhost:8011
QUIZFORGE_MCP_URL = "QUIZFORGE_MCP_URL"                # default: http://localhost:8021
CERTSTUDIO_MCP_URL = "CERTSTUDIO_MCP_URL"              # default: http://localhost:8031
FETCHDESK_MCP_URL = "FETCHDESK_MCP_URL"                # default: http://localhost:8041
MCP_SHARED_SECRET = "MCP_SHARED_SECRET"
# Prefer per-product secrets (Sprint-4 #29); MCP_SHARED_SECRET is deprecated fallback.
CEG_MCP_SECRET = "CEG_MCP_SECRET"
WORKSHOPOS_MCP_SECRET = "WORKSHOPOS_MCP_SECRET"
QUIZFORGE_MCP_SECRET = "QUIZFORGE_MCP_SECRET"
CERTSTUDIO_MCP_SECRET = "CERTSTUDIO_MCP_SECRET"
FETCHDESK_MCP_SECRET = "FETCHDESK_MCP_SECRET"
AGENT_STREAM_RATE_TOKENS_PER_SEC = "AGENT_STREAM_RATE_TOKENS_PER_SEC"
AGENT_STREAM_RATE_BURST = "AGENT_STREAM_RATE_BURST"
AGENT_STREAM_RATE_ENABLED = "AGENT_STREAM_RATE_ENABLED"

# Deprecated per-product names — map to canonical (do not use in new code)
_DEPRECATED: dict[str, str] = {
    "CEG_OLLAMA_BASE_URL": AGENT_OLLAMA_BASE_URL,
    "OLLAMA_BASE_URL": AGENT_OLLAMA_BASE_URL,
    "WORKSHOPOS_OLLAMA_URL": AGENT_OLLAMA_BASE_URL,
    "FETCHDESK_OLLAMA_URL": AGENT_OLLAMA_BASE_URL,
    "OLLAMA_URL": AGENT_OLLAMA_BASE_URL,
    "OLLAMA_DEFAULT_MODEL": OLLAMA_CHEAP_MODEL,
    "OLLAMA_MODEL": OLLAMA_CHEAP_MODEL,
    "CEG_OLLAMA_MODEL": OLLAMA_CHEAP_MODEL,
    "CEG_OLLAMA_MODEL_FAST": OLLAMA_CHEAP_MODEL,
    "OLLAMA_FAST_MODEL": OLLAMA_CHEAP_MODEL,
    "AI_PROCTOR_MODEL": OLLAMA_VISION_MODEL,
    "OLLAMA_EMBED_MODEL": OLLAMA_EMBEDDING_MODEL,
}


def resolve_env(canonical_name: str, default: str = "") -> str:
    """Read env var by canonical name; fall back to deprecated aliases with a warning."""
    val = os.getenv(canonical_name)
    if val:
        return val
    for deprecated, canonical in _DEPRECATED.items():
        if canonical == canonical_name:
            val = os.getenv(deprecated)
            if val:
                log.warning(
                    "env_resolver.deprecated_var",
                    deprecated=deprecated,
                    use_instead=canonical_name,
                )
                return val
    return default


# ── Legacy helper functions (kept for backward compat) ───────────────────────

_DEFAULT_MODEL = "qwen2.5:7b-instruct"


def resolve_ollama_model(prefix: str = "") -> str:
    """Try multiple env var name patterns; return first found."""
    candidates = [
        f"{prefix}OLLAMA_MODEL",
        f"{prefix}OLLAMA_DEFAULT_MODEL",
        f"{prefix}OLLAMA_CHAT_MODEL",
        "OLLAMA_MODEL",
        "OLLAMA_DEFAULT_MODEL",
        "OLLAMA_CHAT_MODEL",
    ]
    # Also check canonical names
    canonical_val = resolve_env(OLLAMA_CHEAP_MODEL)
    if canonical_val:
        return canonical_val
    for key in candidates:
        val = (os.getenv(key) or "").strip()
        if val:
            return val
    log.warning("ollama_model_env_missing", fallback=_DEFAULT_MODEL)
    return _DEFAULT_MODEL


def resolve_ollama_fast_model(prefix: str = "") -> str:
    candidates = [
        f"{prefix}OLLAMA_FAST_MODEL",
        f"{prefix}OLLAMA_MODEL_FAST",
        f"{prefix}FETCHDESK_OLLAMA_MODEL_FAST",
        "OLLAMA_FAST_MODEL",
        "OLLAMA_MODEL_FAST",
    ]
    for key in candidates:
        val = (os.getenv(key) or "").strip()
        if val:
            return val
    return resolve_ollama_model(prefix)


def resolve_ollama_base_url(prefix: str = "") -> str:
    # Check canonical first
    canonical_val = resolve_env(AGENT_OLLAMA_BASE_URL)
    if canonical_val:
        return canonical_val.rstrip("/")
    candidates = [
        f"{prefix}OLLAMA_BASE_URL",
        f"{prefix}CEG_OLLAMA_BASE_URL",
        "OLLAMA_BASE_URL",
        "CEG_OLLAMA_BASE_URL",
    ]
    for key in candidates:
        val = (os.getenv(key) or "").strip()
        if val:
            return val.rstrip("/")
    return "http://localhost:11434"


# ── VM profile + agent runtime defaults ─────────────────────────────────────


def get_vm_profile() -> str:
    """Active OLLAMA_VM_PROFILE: tiny | small | standard."""
    raw = resolve_env(OLLAMA_VM_PROFILE, "standard").strip().lower()
    if raw in ("tiny", "small", "standard"):
        return raw
    return "standard"


def _profile_agent_defaults(profile: str) -> dict[str, int | bool]:
    """In-process defaults when env vars are unset (standard preserves legacy behavior)."""
    if profile == "tiny":
        return {
            AGENT_MAX_CONCURRENT_TURNS: 1,
            AGENT_MAX_HISTORY_TURNS: 6,
            AGENT_PROMPT_TOKEN_BUDGET: 1500,
            AGENT_OOM_COOLDOWN_SEC: 30,
            AGENT_TURN_QUEUE_TIMEOUT_SEC: 30,
            OLLAMA_NUM_CTX: 2048,
            OLLAMA_NUM_CTX_FAST: 1024,
            OLLAMA_KEEP_ALIVE: 0,
            OLLAMA_EMBED_SEQUENTIAL: True,
            AGENT_REFLECTION_ENABLED: False,
        }
    if profile == "small":
        return {
            AGENT_MAX_CONCURRENT_TURNS: 2,
            AGENT_MAX_HISTORY_TURNS: 12,
            AGENT_PROMPT_TOKEN_BUDGET: 2500,
            AGENT_OOM_COOLDOWN_SEC: 30,
            AGENT_TURN_QUEUE_TIMEOUT_SEC: 30,
            OLLAMA_NUM_CTX: 3072,
            OLLAMA_NUM_CTX_FAST: 1536,
            # WL-082: multi-hour keep-alive for DEV/staging warmth (was 120s).
            OLLAMA_KEEP_ALIVE: 14400,
            OLLAMA_EMBED_SEQUENTIAL: True,
            AGENT_REFLECTION_ENABLED: False,
            # Model tier policy (match cert-studio.env.vm): fast/json=1.5b, default agent=3b,
            # capable/heavy=3b-7b only when VM RAM allows explicit OLLAMA_CAPABLE_MODEL pull.
        }
    return {
        AGENT_MAX_CONCURRENT_TURNS: 4,
        AGENT_MAX_HISTORY_TURNS: 20,
        AGENT_PROMPT_TOKEN_BUDGET: 4000,
        AGENT_OOM_COOLDOWN_SEC: 30,
        AGENT_TURN_QUEUE_TIMEOUT_SEC: 30,
        OLLAMA_NUM_CTX: 4096,
        OLLAMA_NUM_CTX_FAST: 2048,
        OLLAMA_KEEP_ALIVE: 14400,
        OLLAMA_EMBED_SEQUENTIAL: False,
        AGENT_REFLECTION_ENABLED: True,
    }


def resolve_int_env(name: str, *, profile_default: int | None = None) -> int:
    """Read integer env var, else profile default, else explicit profile_default."""
    raw = os.getenv(name)
    if raw is not None and str(raw).strip():
        try:
            return int(str(raw).strip())
        except ValueError:
            log.warning("env_resolver.invalid_int", name=name, value=raw)
    if profile_default is not None:
        return profile_default
    defaults = _profile_agent_defaults(get_vm_profile())
    val = defaults.get(name)
    if isinstance(val, bool):
        return int(val)
    if isinstance(val, int):
        return val
    return 0


def resolve_bool_env(name: str, *, profile_default: bool | None = None) -> bool:
    raw = os.getenv(name)
    if raw is not None and str(raw).strip():
        return str(raw).strip().lower() in ("1", "true", "yes", "on")
    if profile_default is not None:
        return profile_default
    defaults = _profile_agent_defaults(get_vm_profile())
    val = defaults.get(name)
    if isinstance(val, bool):
        return val
    return False


def ollama_env_profile(profile: str | None = None) -> dict[str, str]:
    """Recommended Ollama *server* environment variables for a VM tier."""
    tier = (profile or get_vm_profile()).strip().lower()
    if tier == "tiny":
        return {
            "OLLAMA_NUM_PARALLEL": "1",
            "OLLAMA_MAX_LOADED_MODELS": "1",
            "OLLAMA_KEEP_ALIVE": "0",
            "OLLAMA_NUM_THREADS": "2",
            "OLLAMA_FLASH_ATTENTION": "1",
            "OLLAMA_KV_CACHE_TYPE": "q8_0",
            "OLLAMA_NUM_CTX": "2048",
        }
    if tier == "small":
        return {
            "OLLAMA_NUM_PARALLEL": "1",
            "OLLAMA_MAX_LOADED_MODELS": "1",
            "OLLAMA_KEEP_ALIVE": "4h",
            "OLLAMA_NUM_THREADS": "4",
            "OLLAMA_FLASH_ATTENTION": "1",
            "OLLAMA_KV_CACHE_TYPE": "q8_0",
            "OLLAMA_NUM_CTX": "3072",
        }
    return {
        "OLLAMA_NUM_PARALLEL": "2",
        "OLLAMA_MAX_LOADED_MODELS": "2",
        "OLLAMA_KEEP_ALIVE": "4h",
        "OLLAMA_NUM_THREADS": "8",
        "OLLAMA_FLASH_ATTENTION": "1",
        "OLLAMA_KV_CACHE_TYPE": "f16",
        "OLLAMA_NUM_CTX": "4096",
    }


def recommended_models_for_profile(profile: str | None = None) -> dict[str, str]:
    """Suggested OLLAMA_* model env values per VM tier (override via env when needed)."""
    tier = (profile or get_vm_profile()).strip().lower()
    if tier == "tiny":
        tiny = "qwen2.5:3b-instruct-q4_K_M"
        return {
            OLLAMA_CHEAP_MODEL: tiny,
            OLLAMA_CAPABLE_MODEL: tiny,
            OLLAMA_JSON_MODEL: tiny,
            OLLAMA_EMBEDDING_MODEL: "nomic-embed-text",
        }
    if tier == "small":
        return {
            OLLAMA_CHEAP_MODEL: "qwen2.5:7b",
            OLLAMA_CAPABLE_MODEL: "qwen2.5:7b",
            OLLAMA_JSON_MODEL: "qwen2.5:7b",
            OLLAMA_EMBEDDING_MODEL: "nomic-embed-text",
        }
    return {
        OLLAMA_CHEAP_MODEL: "qwen2.5:7b",
        OLLAMA_CAPABLE_MODEL: "qwen2.5:14b",
        OLLAMA_JSON_MODEL: "qwen2.5:7b",
        OLLAMA_EMBEDDING_MODEL: "nomic-embed-text",
    }


def log_ollama_env_profile_at_startup(*, product: str = "agent-core") -> None:
    """Emit structured log of recommended Ollama server env for the active VM profile."""
    profile = get_vm_profile()
    log.info(
        "ollama_vm_profile",
        product=product,
        profile=profile,
        ollama_server_env=ollama_env_profile(profile),
        recommended_models=recommended_models_for_profile(profile),
        agent_defaults={
            k: _profile_agent_defaults(profile).get(k)
            for k in (
                AGENT_MAX_CONCURRENT_TURNS,
                AGENT_MAX_HISTORY_TURNS,
                OLLAMA_NUM_CTX,
                OLLAMA_KEEP_ALIVE,
            )
        },
    )

