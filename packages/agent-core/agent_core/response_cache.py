"""Redis semantic/exact response cache for agent turns (hash of tenant+prompt).

Sprint-7 #4: semantic_cache_key normalizes whitespace/case for generate-class
prompts so identical intent hits within a tenant.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from typing import Any


def _ttl_sec() -> int:
    try:
        return max(30, int(os.getenv("AGENT_RESPONSE_CACHE_TTL_SEC", "600")))
    except ValueError:
        return 600


def normalize_prompt_for_cache(prompt: str) -> str:
    """Whitespace collapse + casefold for semantic generate-class cache keys."""
    collapsed = re.sub(r"\s+", " ", (prompt or "").strip())
    return collapsed.casefold()


def cache_key(*, tenant_id: str, product: str, prompt: str, model: str = "") -> str:
    """Exact key (strip only) — backward compatible."""
    digest = hashlib.sha256(
        f"{tenant_id}|{product}|{model}|{prompt.strip()}".encode("utf-8")
    ).hexdigest()[:32]
    return f"agent:resp_cache:{product}:{digest}"


def semantic_cache_key(
    *,
    tenant_id: str,
    product: str,
    prompt: str,
    model: str = "",
    cache_class: str = "generate",
) -> str:
    """Normalized key for generate/write-text class prompts (Sprint-7 #4)."""
    norm = normalize_prompt_for_cache(prompt)
    digest = hashlib.sha256(
        f"{tenant_id}|{product}|{model}|{cache_class}|{norm}".encode("utf-8")
    ).hexdigest()[:32]
    return f"agent:resp_cache:sem:{product}:{digest}"


def resolve_cache_key(
    *,
    tenant_id: str,
    product: str,
    prompt: str,
    model: str = "",
    semantic: bool | None = None,
) -> str:
    """Prefer semantic key when AGENT_SEMANTIC_CACHE_ENABLED (default true)."""
    if semantic is None:
        raw = (os.getenv("AGENT_SEMANTIC_CACHE_ENABLED") or "true").strip().lower()
        semantic = raw not in {"0", "false", "no", "off"}
    if semantic:
        return semantic_cache_key(
            tenant_id=tenant_id, product=product, prompt=prompt, model=model
        )
    return cache_key(tenant_id=tenant_id, product=product, prompt=prompt, model=model)


async def get_cached_response(redis: Any, key: str) -> dict[str, Any] | None:
    if redis is None:
        return None
    try:
        raw = await redis.get(key)
        if not raw:
            return None
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        data = json.loads(raw)
        if isinstance(data, dict):
            data.setdefault("cache_hit", True)
            return data
        return None
    except Exception:
        return None


async def set_cached_response(redis: Any, key: str, payload: dict[str, Any]) -> None:
    if redis is None:
        return
    try:
        body = dict(payload)
        body.setdefault("cache_hit", False)
        await redis.setex(key, _ttl_sec(), json.dumps(body, ensure_ascii=False))
    except Exception:
        pass
