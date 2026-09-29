"""Shared SQLAlchemy audit adapter factory for product backends."""

from __future__ import annotations

import uuid
from typing import Any, Callable

from agent_core.audit_logger import AgentAuditDbAdapter, AgentAuditEntry


def make_audit_adapter(
    db: Any,
    *,
    row_factory: Callable[[AgentAuditEntry], Any],
) -> AgentAuditDbAdapter:
    class _Adapter(AgentAuditDbAdapter):
        async def write_audit(self, entry: AgentAuditEntry) -> None:
            row = row_factory(entry)
            db.add(row)
            await db.flush()

    return _Adapter()


def audit_row_defaults(entry: AgentAuditEntry) -> dict[str, Any]:
    meta = dict(entry.meta or {})
    if entry.search_queries or entry.external_urls_fetched or entry.search_enabled:
        meta.setdefault("internet", {})
        internet = meta["internet"]
        if entry.search_queries:
            internet["search_queries"] = list(entry.search_queries)
        if entry.external_urls_fetched:
            internet["external_urls_fetched"] = list(entry.external_urls_fetched)
        if entry.search_enabled:
            internet["search_enabled"] = entry.search_enabled
    return {
        "id": uuid.uuid4(),
        "session_id": uuid.UUID(entry.session_id),
        "tenant_id": entry.tenant_id,
        "product": entry.product,
        "user_id": entry.user_id,
        "mode": entry.mode,
        "intent": entry.intent,
        "prompt_hash": entry.prompt_hash,
        "tools_called": list(entry.tools_called),
        "tool_results_summary": entry.tool_results_summary or "",
        "latency_ms": entry.latency_ms,
        "model_used": entry.model_used or "",
        "byo_model": entry.byo_model,
        "error": entry.error,
        "meta": meta,
    }
