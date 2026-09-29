"""Pydantic v2 schemas for agent runtime, sessions, and SSE events."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class TaskKind(str, Enum):
    agent_loop = "agent_loop"
    json_extract = "json_extract"
    chat_fast = "chat_fast"
    embedding = "embedding"
    formal_rewrite = "formal_rewrite"
    planning = "planning"
    vision = "vision"


class AgentMode(str, Enum):
    ask = "ask"
    plan = "plan"
    agent = "agent"


class AgentProduct(str, Enum):
    cert_studio = "cert_studio"
    quizforge = "quizforge"
    fetchdesk = "fetchdesk"
    workshopos = "workshopos"
    ceg_portal = "ceg_portal"


class AgentMessage(BaseModel):
    role: Literal["user", "assistant", "system", "tool"]
    content: str
    created_at: datetime | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters_schema: dict[str, Any] = Field(default_factory=dict)


class ToolSpec(ToolDefinition):
    """Alias kept for backward compatibility with phase-1 docs."""


class ToolCall(BaseModel):
    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class ToolCallRequest(ToolCall):
    """Request shape used by ToolRegistry.execute."""


class AgentSession(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    tenant_id: str
    user_id: str
    product: AgentProduct
    created_at: datetime = Field(default_factory=lambda: datetime.now().astimezone())
    meta: dict[str, Any] = Field(default_factory=dict)


class AgentConfig(BaseModel):
    product: AgentProduct
    persona: str
    tool_names: list[str] = Field(default_factory=list)
    mode: AgentMode = AgentMode.agent
    enabled: bool = True
    max_turns: int = Field(default=5, ge=1, le=20)
    temperature: float = Field(default=0.4, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=64, le=16384)
    max_output_words: int = Field(default=1500, ge=100, le=8000)
    topic_allowlist: list[str] = Field(default_factory=list)
    block_patterns: list[str] = Field(default_factory=list)
    enable_loop_planning: bool = False
    include_internet_tools: bool = True


class AgentAttachment(BaseModel):
    filename: str = Field(default="attachment")
    media_type: str = Field(default="application/octet-stream")
    url: str | None = None
    base64_data: str | None = None


class SessionCapabilities(BaseModel):
    web_search_enabled: bool = False
    url_fetch_enabled: bool = False
    debug_mode: bool = False
    image_vision_enabled: bool = False
    pdf_parse_enabled: bool = False


class AgentStreamRequest(BaseModel):
    session_id: uuid.UUID | None = None
    prompt: str = Field(max_length=4000)
    mode: AgentMode = AgentMode.agent
    messages: list[dict[str, str]] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)
    attachments: list[AgentAttachment] = Field(default_factory=list)
    web_search_enabled: bool | None = None
    url_fetch_enabled: bool | None = None
    debug_mode: bool = False


class StreamEvent(BaseModel):
    event: Literal[
        "thought",
        "token",
        "tool",
        "tool_result",
        "tool_missed",
        "action",
        "message",
        "error",
        "done",
        "preprocessed",
        "plan_step",
        "plan_complete",
    ]
    text: str | None = None
    name: str | None = None
    action: dict[str, Any] | None = None
    intent: str | None = None
    suggested_mode: str | None = None
    confidence: float | None = None
    step: int | None = None
    error: bool | None = None
    meta: dict[str, Any] | None = None

    def to_sse_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


AgentStreamEvent = StreamEvent


class AgentRunResult(BaseModel):
    session_id: str
    final_message: str = ""
    tool_calls: list[ToolCall] = Field(default_factory=list)
    turns: int = 0
    blocked: bool = False
    error: str | None = None


# ── Sprint 1: artifact + step-event types ────────────────────────────────────

class ArtifactType(str, Enum):
    QUIZ = "quiz"
    CERTIFICATE = "certificate"
    EVENT = "event"
    DIGEST = "digest"
    LANDING_PAGE = "landing_page"
    DOCUMENT = "document"
    IMAGE = "image"
    CODE = "code"


class ArtifactResponse(BaseModel):
    artifact_id: str
    artifact_type: ArtifactType
    title: str
    preview_url: str | None = None
    download_url: str | None = None
    metadata: dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StepEvent(BaseModel):
    step_id: str
    step_name: str
    tool_called: str | None = None
    status: Literal["running", "done", "failed", "waiting_approval"]
    started_at: datetime
    ended_at: datetime | None = None
    result_summary: str | None = None


class VerifyResult(BaseModel):
    confident: bool
    score: float  # 0.0 – 1.0
    issues: list[str] = []


# ── Sprint 3: typed memory schemas ───────────────────────────────────────────

class MemoryType(str, Enum):
    EPISODIC = "episodic"       # specific past interactions
    SEMANTIC = "semantic"       # facts about domain/products
    PROCEDURAL = "procedural"   # learned procedures/patterns
    WORKING = "working"         # current task scratchpad (Redis, TTL 1h)


class MemoryRecord(BaseModel):
    memory_id: str
    tenant_id: str
    user_id: str | None = None
    memory_type: MemoryType
    content: str
    embedding: list[float] | None = None
    metadata: dict = {}
    created_at: datetime
    expires_at: datetime | None = None  # only for WORKING type
