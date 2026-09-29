"""Platform-wide agent audit logging protocol."""

from __future__ import annotations

import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class AgentAuditEntry:
    session_id: str
    tenant_id: str
    product: str
    user_id: str
    mode: str
    intent: str
    prompt_hash: str
    tools_called: list[str] = field(default_factory=list)
    tool_results_summary: str = ""
    latency_ms: int = 0
    model_used: str = ""
    byo_model: bool = False
    error: str | None = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    meta: dict[str, Any] = field(default_factory=dict)
    search_queries: list[str] = field(default_factory=list)
    external_urls_fetched: list[str] = field(default_factory=list)
    search_enabled: bool = False


def hash_prompt_for_audit(system_prompt: str, user_message: str) -> str:
    payload = f"{system_prompt}\n---\n{user_message}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


class AgentAuditDbAdapter(ABC):
    @abstractmethod
    async def write_audit(self, entry: AgentAuditEntry) -> None:
        ...


class AgentAuditLogger:
    def __init__(
        self,
        *,
        db_adapter: AgentAuditDbAdapter | None = None,
        redis_client: Any | None = None,
    ) -> None:
        self._db = db_adapter
        self._redis = redis_client

    async def log(self, entry: AgentAuditEntry) -> None:
        if self._db is not None:
            await self._db.write_audit(entry)
        try:
            from agent_core.observability import trace_agent_turn

            trace_agent_turn(entry)
        except Exception:
            pass
        if self._redis is not None:
            key = f"agent:audit:{entry.product}:{entry.tenant_id}:{entry.session_id}"
            summary = {
                "mode": entry.mode,
                "intent": entry.intent,
                "tools": entry.tools_called,
                "latency_ms": entry.latency_ms,
                "model": entry.model_used,
                "status": "error" if entry.error else "ok",
            }
            try:
                import json

                await self._redis.setex(key, 604_800, json.dumps(summary))
            except Exception:
                pass
