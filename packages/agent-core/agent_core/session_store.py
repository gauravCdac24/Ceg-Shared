"""Redis-backed session ownership helpers for product routers."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException

from agent_core.memory_service import MemoryService
from agent_core.schemas import AgentProduct, AgentSession


async def persist_session(memory: MemoryService, session: AgentSession) -> None:
    await memory.save_session_meta(
        product=session.product,
        tenant_id=session.tenant_id,
        session_id=str(session.id),
        meta={
            "user_id": session.user_id,
            "tenant_id": session.tenant_id,
            "product": session.product.value,
            "created_at": session.created_at.isoformat()
            if isinstance(session.created_at, datetime)
            else str(session.created_at),
            "updated_at": session.created_at.isoformat()
            if isinstance(session.created_at, datetime)
            else str(session.created_at),
            "title": None,
            "meta": session.meta,
        },
    )


async def require_owned_session(
    memory: MemoryService,
    *,
    session_id: uuid.UUID,
    tenant_id: str,
    user_id: str,
    product: AgentProduct,
) -> dict[str, Any]:
    meta = await memory.get_session_meta(
        product=product,
        tenant_id=tenant_id,
        session_id=str(session_id),
    )
    # CS-MT-001: never leak existence across tenant/user — always 404.
    if meta is None:
        raise HTTPException(404, "Session not found")
    if meta.get("user_id") != user_id or meta.get("tenant_id") != tenant_id:
        raise HTTPException(404, "Session not found")
    return meta


async def delete_session_meta(
    memory: MemoryService,
    *,
    session_id: uuid.UUID,
    tenant_id: str,
    product: AgentProduct,
) -> None:
    await memory.clear_session(
        tenant_id=tenant_id,
        session_id=str(session_id),
        product=product,
    )
