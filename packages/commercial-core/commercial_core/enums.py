"""Commercial platform enumerations."""

from __future__ import annotations

from enum import Enum


class OrgType(str, Enum):
    GOVERNMENT_CENTRAL = "government_central"
    GOVERNMENT_STATE = "government_state"
    GOVERNMENT_LOCAL = "government_local"
    DEFENCE = "defence"
    ACADEMIC_UNIVERSITY = "academic_university"
    ACADEMIC_COLLEGE = "academic_college"
    ACADEMIC_SCHOOL = "academic_school"
    RESEARCH_INSTITUTE = "research_institute"
    NGO_REGISTERED = "ngo_registered"
    STARTUP_DPIIT = "startup_dpiit"
    CORPORATE_MSME = "corporate_msme"
    CORPORATE_LARGE = "corporate_large"
    INDIVIDUAL = "individual"
    FOREIGN = "foreign"


class PlanTier(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    GOVERNMENT = "government"
    UNLIMITED = "unlimited"


class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"
    LIFETIME = "lifetime"
    TRIAL = "trial"


class SubscriptionStatus(str, Enum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    WAIVED = "waived"


GOVERNMENT_ORG_TYPES = frozenset(
    {
        OrgType.GOVERNMENT_CENTRAL,
        OrgType.GOVERNMENT_STATE,
        OrgType.GOVERNMENT_LOCAL,
        OrgType.DEFENCE,
    }
)
