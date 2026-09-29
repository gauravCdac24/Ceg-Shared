"""Token × rate-card cost ledger (Sprint-5 #56).

Stores USD-estimated cost per LLM call. Rate card from env JSON or defaults.
In-memory by default; optional Redis list for multi-worker aggregation.
Never stores raw prompts.
"""

from __future__ import annotations

import json
import os
import threading
import time
from dataclasses import asdict, dataclass
from typing import Any

import structlog

log = structlog.get_logger(__name__)

# USD per 1K tokens (prompt / completion). Local Ollama treated as near-zero.
_DEFAULT_RATE_CARD: dict[str, dict[str, float]] = {
    "default": {"prompt": 0.0, "completion": 0.0},
    "qwen2.5": {"prompt": 0.0, "completion": 0.0},
    "gpt-4o": {"prompt": 0.0025, "completion": 0.01},
    "gpt-4o-mini": {"prompt": 0.00015, "completion": 0.0006},
    "claude-3": {"prompt": 0.003, "completion": 0.015},
}

_lock = threading.Lock()
_entries: list["CostEntry"] = []
_MAX_ENTRIES = 5000


@dataclass(frozen=True)
class CostEntry:
    ts: float
    tenant_id: str
    product: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    rate_prompt_per_1k: float
    rate_completion_per_1k: float
    cost_usd: float


def _rate_card() -> dict[str, dict[str, float]]:
    raw = (os.getenv("AGENT_MODEL_RATE_CARD_JSON") or "").strip()
    if not raw:
        return dict(_DEFAULT_RATE_CARD)
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            out = dict(_DEFAULT_RATE_CARD)
            for k, v in parsed.items():
                if isinstance(v, dict):
                    out[str(k)] = {
                        "prompt": float(v.get("prompt", 0)),
                        "completion": float(v.get("completion", 0)),
                    }
            return out
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        log.warning("rate_card_parse_failed", error=str(exc))
    return dict(_DEFAULT_RATE_CARD)


def _rates_for_model(model: str) -> tuple[float, float]:
    card = _rate_card()
    key = (model or "").strip().lower()
    if key in card:
        row = card[key]
        return float(row.get("prompt", 0)), float(row.get("completion", 0))
    for prefix, row in card.items():
        if prefix != "default" and key.startswith(prefix):
            return float(row.get("prompt", 0)), float(row.get("completion", 0))
    row = card.get("default", {"prompt": 0.0, "completion": 0.0})
    return float(row.get("prompt", 0)), float(row.get("completion", 0))


def compute_cost_usd(
    *,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
) -> tuple[float, float, float]:
    rp, rc = _rates_for_model(model)
    cost = (prompt_tokens / 1000.0) * rp + (completion_tokens / 1000.0) * rc
    return cost, rp, rc


def record_llm_cost(
    *,
    tenant_id: str,
    product: str,
    model: str,
    prompt_tokens: int | None,
    completion_tokens: int | None,
    redis_client: Any = None,
) -> CostEntry | None:
    pt = int(prompt_tokens or 0)
    ct = int(completion_tokens or 0)
    if pt <= 0 and ct <= 0:
        return None
    cost, rp, rc = compute_cost_usd(model=model, prompt_tokens=pt, completion_tokens=ct)
    entry = CostEntry(
        ts=time.time(),
        tenant_id=(tenant_id or "unknown")[:64],
        product=(product or "unknown")[:48],
        model=(model or "unknown")[:64],
        prompt_tokens=pt,
        completion_tokens=ct,
        rate_prompt_per_1k=rp,
        rate_completion_per_1k=rc,
        cost_usd=round(cost, 8),
    )
    with _lock:
        _entries.append(entry)
        if len(_entries) > _MAX_ENTRIES:
            del _entries[: len(_entries) - _MAX_ENTRIES]
    if redis_client is not None:
        try:
            key = f"agent:cost_ledger:{(tenant_id or 'unknown')[:64]}"
            payload = json.dumps(asdict(entry))
            maybe = redis_client.rpush(key, payload)
            if hasattr(maybe, "__await__"):
                # sync API expected; ignore async clients here
                pass
            else:
                redis_client.ltrim(key, -2000, -1)
                redis_client.expire(key, 60 * 60 * 24 * 30)
        except Exception as exc:  # noqa: BLE001
            log.debug("cost_ledger_redis_failed", error=str(exc))
    return entry


def tenant_cost_summary(tenant_id: str) -> dict[str, Any]:
    tid = (tenant_id or "").strip()
    with _lock:
        rows = [e for e in _entries if e.tenant_id == tid]
    total = sum(e.cost_usd for e in rows)
    tokens_in = sum(e.prompt_tokens for e in rows)
    tokens_out = sum(e.completion_tokens for e in rows)
    return {
        "tenant_id": tid,
        "calls": len(rows),
        "prompt_tokens": tokens_in,
        "completion_tokens": tokens_out,
        "cost_usd": round(total, 8),
        "entries": [asdict(e) for e in rows[-50:]],
    }


def clear_ledger_for_tests() -> None:
    with _lock:
        _entries.clear()
