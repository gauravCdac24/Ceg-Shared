"""Capability → MCP server mapping for the CEG AI Agent Platform."""
from __future__ import annotations

import os

import structlog
from pydantic import BaseModel

logger = structlog.get_logger()


class CapabilityRef(BaseModel):
    capability_name: str
    product: str
    mcp_server_url: str
    tool_name: str
    description: str
    input_schema: dict = {}
    requires_approval: bool = False


class CapabilityNotFound(Exception):
    pass


class CapabilityRegistry:
    def __init__(self) -> None:
        self._caps: dict[str, CapabilityRef] = {}

    def register(self, ref: CapabilityRef) -> None:
        self._caps[ref.capability_name] = ref
        logger.debug("capability_registry.registered", name=ref.capability_name, product=ref.product)

    def resolve(self, capability_name: str) -> CapabilityRef:
        if capability_name not in self._caps:
            raise CapabilityNotFound(f"Capability '{capability_name}' not registered")
        return self._caps[capability_name]

    def list_all(self) -> list[CapabilityRef]:
        return list(self._caps.values())

    def list_for_product(self, product: str) -> list[CapabilityRef]:
        return [c for c in self._caps.values() if c.product == product]


# Global singleton
capability_registry = CapabilityRegistry()

# Register built-in capabilities from env
_DEFAULTS: list[CapabilityRef] = [
    # QuizForge
    CapabilityRef(
        capability_name="create_quiz",
        product="quizforge",
        mcp_server_url=os.getenv("QUIZFORGE_MCP_URL", "http://localhost:8021"),
        tool_name="generate_questions",
        description="Generate adaptive quiz from topic",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="add_questions_to_pool",
        product="quizforge",
        mcp_server_url=os.getenv("QUIZFORGE_MCP_URL", "http://localhost:8021"),
        tool_name="add_questions_to_pool",
        description="Propose questions for the tenant bank (ghost preview; Accept required)",
        requires_approval=True,
    ),
    CapabilityRef(
        capability_name="search_question_pool",
        product="quizforge",
        mcp_server_url=os.getenv("QUIZFORGE_MCP_URL", "http://localhost:8021"),
        tool_name="search_question_pool",
        description="Search published/draft questions in the tenant pool",
        requires_approval=False,
    ),
    # Cert Studio
    CapabilityRef(
        capability_name="issue_certificate",
        product="certstudio",
        mcp_server_url=os.getenv("CERTSTUDIO_MCP_URL", "http://localhost:8031"),
        tool_name="preview_certificate",
        description="Preview and issue certificate to recipient",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="bulk_issue_certificates",
        product="certstudio",
        mcp_server_url=os.getenv("CERTSTUDIO_MCP_URL", "http://localhost:8031"),
        tool_name="bulk_issue_certificates",
        description="Bulk issue certificates from CSV",
        requires_approval=True,
    ),
    CapabilityRef(
        capability_name="create_certificate_template",
        product="certstudio",
        mcp_server_url=os.getenv("CERTSTUDIO_MCP_URL", "http://localhost:8031"),
        tool_name="handle_create_from_brief_intent",
        description="Create new certificate template from brief",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="update_template_theme",
        product="certstudio",
        mcp_server_url=os.getenv("CERTSTUDIO_MCP_URL", "http://localhost:8031"),
        tool_name="handle_improve_intent",
        description="Apply color/font theme to template",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="get_template_info",
        product="certstudio",
        mcp_server_url=os.getenv("CERTSTUDIO_MCP_URL", "http://localhost:8031"),
        tool_name="get_template_info",
        description="Read template metadata, version, status, and variable schema",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="check_cert_job_status",
        product="certstudio",
        mcp_server_url=os.getenv("CERTSTUDIO_MCP_URL", "http://localhost:8031"),
        tool_name="check_job_status",
        description="Poll bulk certificate job status",
        requires_approval=False,
    ),
    # WorkshopOS
    CapabilityRef(
        capability_name="get_workshop_stats",
        product="workshopos",
        mcp_server_url=os.getenv("WORKSHOPOS_MCP_URL", "http://localhost:8011"),
        tool_name="get_workshop_stats",
        description="Read-only dashboard metrics for the tenant",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="list_registrations",
        product="workshopos",
        mcp_server_url=os.getenv("WORKSHOPOS_MCP_URL", "http://localhost:8011"),
        tool_name="list_registrations",
        description="List recent workshop registrations/bookings",
        requires_approval=False,
    ),
    # FetchDesk
    CapabilityRef(
        capability_name="fetch_news_digest",
        product="fetchdesk",
        mcp_server_url=os.getenv("FETCHDESK_MCP_URL", "http://localhost:8041"),
        tool_name="get_pending_items",
        description="List unreviewed inbox items for editorial queue",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="summarize_item",
        product="fetchdesk",
        mcp_server_url=os.getenv("FETCHDESK_MCP_URL", "http://localhost:8041"),
        tool_name="enrich_item",
        description="AI summarise a fetched news item",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="generate_social_posts",
        product="fetchdesk",
        mcp_server_url=os.getenv("FETCHDESK_MCP_URL", "http://localhost:8041"),
        tool_name="generate_social_posts",
        description="Generate social media posts from item",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="rewrite_formal",
        product="fetchdesk",
        mcp_server_url=os.getenv("FETCHDESK_MCP_URL", "http://localhost:8041"),
        tool_name="rewrite_formal",
        description="Rewrite article body in formal Indian government communication style",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="push_to_ceg_portal",
        product="fetchdesk",
        mcp_server_url=os.getenv("FETCHDESK_MCP_URL", "http://localhost:8041"),
        tool_name="push_to_ceg_portal",
        description="Push an approved article to CeG Portal",
        requires_approval=True,
    ),
    # CeG
    CapabilityRef(
        capability_name="run_quizforge_agent",
        product="ceg",
        mcp_server_url=os.getenv("CEG_MCP_URL", "http://localhost:8001"),
        tool_name="run_quizforge_agent",
        description="Delegate quiz authoring task to QuizForge agent",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="run_certstudio_agent",
        product="ceg",
        mcp_server_url=os.getenv("CEG_MCP_URL", "http://localhost:8001"),
        tool_name="run_certstudio_agent",
        description="Delegate certificate design tasks to Cert Studio agent",
        requires_approval=False,
    ),
    # Handoff capabilities — route sub-tasks to specific product agents
    CapabilityRef(
        capability_name="handoff_to_quizforge",
        product="quizforge",
        mcp_server_url=os.getenv("QUIZFORGE_MCP_URL", "http://localhost:8021"),
        tool_name="run_agent_task",
        description="Delegate a sub-task to QuizForge agent",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="handoff_to_certstudio",
        product="certstudio",
        mcp_server_url=os.getenv("CERTSTUDIO_MCP_URL", "http://localhost:8031"),
        tool_name="run_agent_task",
        description="Delegate a sub-task to Cert Studio agent",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="handoff_to_workshopos",
        product="workshopos",
        mcp_server_url=os.getenv("WORKSHOPOS_MCP_URL", "http://localhost:8011"),
        tool_name="run_agent_task",
        description="Delegate a sub-task to WorkshopOS agent",
        requires_approval=False,
    ),
    CapabilityRef(
        capability_name="handoff_to_fetchdesk",
        product="fetchdesk",
        mcp_server_url=os.getenv("FETCHDESK_MCP_URL", "http://localhost:8041"),
        tool_name="run_agent_task",
        description="Delegate a sub-task to FetchDesk agent",
        requires_approval=False,
    ),
]

for _cap in _DEFAULTS:
    capability_registry.register(_cap)
