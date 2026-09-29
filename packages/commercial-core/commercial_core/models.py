"""Platform commercial SQLAlchemy models (schema: platform_commercial)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from commercial_core.base import CommercialBase
from commercial_core.enums import BillingCycle, OrgType, PlanTier

JsonDict = JSON().with_variant(JSONB, "postgresql")


class Plan(CommercialBase):
    __tablename__ = "plans"
    __table_args__ = {"schema": "platform_commercial"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    tier: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    pricing_by_org_type: Mapped[dict] = mapped_column(JsonDict, nullable=False, default=dict)
    default_monthly_price_paise: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    default_annual_price_paise: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    trial_days: Mapped[int] = mapped_column(Integer, nullable=False, default=14)
    trial_quota_multiplier: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    features: Mapped[dict] = mapped_column(JsonDict, nullable=False, default=dict)
    quotas: Mapped[dict] = mapped_column(JsonDict, nullable=False, default=dict)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class Subscription(CommercialBase):
    __tablename__ = "subscriptions"
    __table_args__ = {"schema": "platform_commercial"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    product: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)
    org_type: Mapped[str] = mapped_column(String(64), nullable=False, default=OrgType.INDIVIDUAL.value)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", index=True)
    billing_cycle: Mapped[str] = mapped_column(String(16), nullable=False, default=BillingCycle.MONTHLY.value)
    trial_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    trial_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    current_period_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_waived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    waiver_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    waiver_granted_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    waiver_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    waiver_document_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    razorpay_subscription_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    razorpay_customer_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_payment_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_payment_amount_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_billing_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    failed_payment_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    grace_period_ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    quota_overrides: Mapped[dict] = mapped_column(JsonDict, nullable=False, default=dict)
    feature_overrides: Mapped[dict] = mapped_column(JsonDict, nullable=False, default=dict)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class QuotaUsage(CommercialBase):
    __tablename__ = "quota_usage"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "product",
            "metric",
            "period_year",
            "period_month",
            "period_day",
            name="uq_quota_usage_period",
        ),
        {"schema": "platform_commercial"},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    product: Mapped[str] = mapped_column(String(32), nullable=False)
    metric: Mapped[str] = mapped_column(String(64), nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    period_day: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_updated: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class PaymentTransaction(CommercialBase):
    __tablename__ = "payment_transactions"
    __table_args__ = {"schema": "platform_commercial"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True, index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    product: Mapped[str] = mapped_column(String(32), nullable=False)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    razorpay_order_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    razorpay_signature: Mapped[str | None] = mapped_column(String(256), nullable=True)
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="created")
    payment_method: Mapped[str | None] = mapped_column(String(32), nullable=True)
    payment_details: Mapped[dict] = mapped_column(JsonDict, nullable=False, default=dict)
    invoice_number: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True)
    invoice_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    gst_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    gst_amount_paise: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    refund_amount_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    webhook_event_id: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class WaiverApplication(CommercialBase):
    __tablename__ = "waiver_applications"
    __table_args__ = {"schema": "platform_commercial"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    product: Mapped[str] = mapped_column(String(32), nullable=False)
    requested_plan_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    org_type: Mapped[str] = mapped_column(String(64), nullable=False)
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    supporting_document_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    contact_name: Mapped[str] = mapped_column(String(128), nullable=False)
    contact_designation: Mapped[str | None] = mapped_column(String(128), nullable=True)
    contact_email: Mapped[str] = mapped_column(String(320), nullable=False)
    contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_waiver_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class InvoiceSequence(CommercialBase):
    __tablename__ = "invoice_sequence"
    __table_args__ = {"schema": "platform_commercial"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    last_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class CommercialAuditLog(CommercialBase):
    __tablename__ = "commercial_audit_log"
    __table_args__ = {"schema": "platform_commercial"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    audit_metadata: Mapped[dict] = mapped_column("metadata", JsonDict, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, index=True)


PLAN_TIERS = [t.value for t in PlanTier]
