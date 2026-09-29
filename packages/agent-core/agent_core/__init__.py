"""Shared AI agent runtime for CeG monorepo products."""

from agent_core.agent_runner import AgentContext, AgentRunner
from agent_core.guardrails import Guardrails, GuardrailResult
from agent_core.memory_service import MemoryDbAdapter, MemoryService
from agent_core.model_router import ModelRouter, RouteDecision
from agent_core.ollama_client import OllamaClient, OllamaClientError
from agent_core.prompt_builder import PromptBuilder
from agent_core.prompt_loader import (
    LoadedPrompt,
    load_prompt,
    load_prompt_meta,
    log_prompt_registry_at_startup,
    parse_prompt_identity,
    prompt_sha256,
    prompts_dir,
)
from agent_core.base_system_prompt import with_safety_preamble, SAFETY_PREAMBLE
from agent_core.circuit_breaker import CircuitBreaker
from agent_core.critic import Critic, CriticVerdict
from agent_core.executor import Executor, ToolExecutionResult
from agent_core.planner import AgentPlan, Planner, PlanStep
from agent_core.recovery_loop import RecoveryLoop, RecoveryPlan
from agent_core.reflection_loop import ReflectionLoop, ReflectionResult
from agent_core.replanning_loop import ReplanningLoop, ReplanResult
from agent_core.self_healing import SelfHealing
from agent_core.task_queue import QueuedAgentJob, enqueue_agent_workflow
from agent_core.tool_calling import extract_tool_calls, specs_to_ollama_tools
from agent_core.audit_logger import AgentAuditEntry, AgentAuditLogger, hash_prompt_for_audit
from agent_core.env_resolver import resolve_ollama_base_url, resolve_ollama_fast_model, resolve_ollama_model
from agent_core.guardrails import OutputGuardrails, OutputGuardResult
from agent_core.query_preprocessor import PreprocessedQuery, QueryPreprocessor, TaskIntent
from agent_core.turn_router import ConversationState, RoutingDecision, TurnRouter
from agent_core.schemas import (
    AgentConfig,
    AgentMessage,
    AgentMode,
    AgentProduct,
    AgentRunResult,
    AgentSession,
    AgentStreamEvent,
    AgentStreamRequest,
    ArtifactResponse,
    ArtifactType,
    StepEvent,
    StreamEvent,
    TaskKind,
    ToolCall,
    ToolCallRequest,
    ToolDefinition,
    ToolSpec,
)
from agent_core.stream_bridge import format_sse, sse_response
from agent_core.tool_registry import ToolNotAllowedError, ToolRegistry
from agent_core.async_callbacks import (
    AsyncCallbackDispatcher,
    LLMCallEvent,
    TurnCallbackScope,
    emit_llm_event,
    get_callback_dispatcher,
)
from agent_core.moderation import ModerationResult, moderate_output, score_toxicity

__all__ = [
    "AgentAuditEntry",
    "AgentAuditLogger",
    "AgentConfig",
    "AgentContext",
    "AgentMessage",
    "AgentMode",
    "AgentProduct",
    "AgentRunResult",
    "AgentRunner",
    "AgentSession",
    "AgentStreamEvent",
    "AgentStreamRequest",
    "AgentPlan",
    "ArtifactResponse",
    "ArtifactType",
    "AsyncCallbackDispatcher",
    "CircuitBreaker",
    "Critic",
    "CriticVerdict",
    "Executor",
    "GuardrailResult",
    "Guardrails",
    "LLMCallEvent",
    "MemoryDbAdapter",
    "MemoryService",
    "ModelRouter",
    "ModerationResult",
    "OllamaClient",
    "OllamaClientError",
    "OutputGuardResult",
    "OutputGuardrails",
    "PlanStep",
    "Planner",
    "PreprocessedQuery",
    "PromptBuilder",
    "TurnCallbackScope",
    "load_prompt",
    "load_prompt_meta",
    "LoadedPrompt",
    "parse_prompt_identity",
    "log_prompt_registry_at_startup",
    "prompt_sha256",
    "prompts_dir",
    "with_safety_preamble",
    "SAFETY_PREAMBLE",
    "QueuedAgentJob",
    "QueryPreprocessor",
    "RecoveryLoop",
    "RecoveryPlan",
    "ReflectionLoop",
    "ReflectionResult",
    "ReplanningLoop",
    "ReplanResult",
    "RouteDecision",
    "SelfHealing",
    "StepEvent",
    "StreamEvent",
    "TaskIntent",
    "ConversationState",
    "RoutingDecision",
    "TurnRouter",
    "ToolCall",
    "ToolCallRequest",
    "ToolDefinition",
    "ToolExecutionResult",
    "ToolNotAllowedError",
    "ToolRegistry",
    "ToolSpec",
    "emit_llm_event",
    "enqueue_agent_workflow",
    "extract_tool_calls",
    "format_sse",
    "get_callback_dispatcher",
    "hash_prompt_for_audit",
    "moderate_output",
    "resolve_ollama_base_url",
    "resolve_ollama_fast_model",
    "resolve_ollama_model",
    "score_toxicity",
    "specs_to_ollama_tools",
    "sse_response",
]
