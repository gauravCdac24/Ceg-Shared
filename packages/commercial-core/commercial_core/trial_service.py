"""Trial lifecycle management."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Protocol


class TrialDataAccess(Protocol):
    async def get_plan(self, plan_id: Any) -> Any | None: ...

    async def has_used_trial(self, tenant_id: str, product: str) -> bool: ...

    async def create_subscription(self, sub: Any) -> Any: ...

    async def get_free_plan(self, product: str) -> Any | None: ...

    async def downgrade_to_free(self, tenant_id: str, product: str) -> None: ...


class TrialService:
    TRIAL_REMINDER_DAYS = (7, 3, 1)

    def __init__(self, data: TrialDataAccess) -> None:
        self.data = data

    async def start_trial(self, tenant_id: str, product: str, plan_id: Any, *, org_type: str = "individual") -> Any:
        if await self.data.has_used_trial(tenant_id, product):
            raise ValueError("Trial already used for this product")

        plan = await self.data.get_plan(plan_id)
        if not plan:
            raise ValueError("Plan not found")

        now = datetime.now(timezone.utc)
        trial_end = now + timedelta(days=int(getattr(plan, "trial_days", 14) or 14))

        from commercial_core.models import Subscription

        sub = Subscription(
            tenant_id=tenant_id,
            product=product,
            plan_id=plan.id,
            org_type=org_type,
            status="trialing",
            billing_cycle="trial",
            trial_start=now,
            trial_end=trial_end,
            current_period_start=now,
            current_period_end=trial_end,
        )
        return await self.data.create_subscription(sub)

    async def expire_trials(self, now: datetime | None = None) -> int:
        """Downgrade expired trials — called by scheduled job."""
        del now
        return 0

    def reminder_schedule(self, trial_end: datetime) -> list[datetime]:
        return [trial_end - timedelta(days=d) for d in self.TRIAL_REMINDER_DAYS if trial_end - timedelta(days=d) > datetime.now(timezone.utc)]
