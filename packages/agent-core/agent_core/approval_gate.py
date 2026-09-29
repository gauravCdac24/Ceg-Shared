"""Human-in-the-loop approval gate for destructive agent operations (Sprint 2)."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Optional

import structlog
from pydantic import BaseModel

logger = structlog.get_logger()


class ApprovalRequest(BaseModel):
    job_id: str
    step_id: str
    step_name: str
    capability_name: str
    preview_data: dict       # what will be executed
    requested_at: datetime
    expires_at: datetime


class ApprovalDecision(BaseModel):
    job_id: str
    approved: bool
    decided_by: str          # user_id
    decided_at: datetime
    comment: Optional[str] = None


class ApprovalGate:
    APPROVAL_TTL = 3600  # 1 hour

    def __init__(self, redis_client: Any) -> None:
        self.redis = redis_client

    async def request_approval(self, request: ApprovalRequest) -> None:
        """Store approval request in Redis and wait for decision."""
        key = f"approval_request:{request.job_id}"
        await self.redis.setex(key, self.APPROVAL_TTL, request.model_dump_json())
        logger.info("approval_gate.requested", job_id=request.job_id, step=request.step_name)

    async def await_decision(self, job_id: str, timeout: int = 3600) -> ApprovalDecision:
        """Poll Redis for approval decision. Raises TimeoutError if not decided in time."""
        key = f"approval_decision:{job_id}"
        for _ in range(timeout):
            raw = await self.redis.get(key)
            if raw:
                await self.redis.delete(key)
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8")
                return ApprovalDecision.model_validate_json(raw)
            await asyncio.sleep(1)
        raise TimeoutError(f"Approval timeout for job {job_id}")

    async def submit_decision(self, decision: ApprovalDecision) -> None:
        """Store the user's approval/rejection decision."""
        key = f"approval_decision:{decision.job_id}"
        await self.redis.setex(key, 300, decision.model_dump_json())
        logger.info(
            "approval_gate.decided",
            job_id=decision.job_id,
            approved=decision.approved,
        )
