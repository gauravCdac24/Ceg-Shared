"""Main async agent loop with tool execution and SSE event streaming."""

from __future__ import annotations

import json
import os
import re
import time
import asyncio
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any

import structlog
from pydantic import BaseModel, Field

from agent_core.env_resolver import AGENT_PLANNER_ENABLED, resolve_bool_env

from agent_core.agent_job_store import AgentJobStatus, update_status
from agent_core.approval_gate import ApprovalDecision, ApprovalGate, ApprovalRequest
from agent_core.env_resolver import (
    AGENT_MAX_CONCURRENT_TURNS,
    AGENT_MAX_HISTORY_TURNS,
    AGENT_REFLECTION_ENABLED,
    AGENT_TURN_QUEUE_TIMEOUT_SEC,
    resolve_bool_env,
    resolve_int_env,
)

PLANNER_ENABLED = resolve_bool_env(AGENT_PLANNER_ENABLED, profile_default=False)

from agent_core.context_compact import estimate_tokens
from agent_core.audit_logger import AgentAuditEntry, AgentAuditLogger, hash_prompt_for_audit
from agent_core.base_system_prompt import (
    INTERNET_SEARCH_RULES_DISABLED,
    INTERNET_SEARCH_RULES_ENABLED,
    capabilities_to_context,
)
from agent_core.tools.register import filter_tool_specs_for_session, resolve_session_capabilities
from agent_core.critic import Critic
from agent_core.executor import DEFAULT_TOOL_TIMEOUT_SEC, Executor
from agent_core.guardrails import Guardrails, OutputGuardrails
from agent_core.memory_service import MemoryService
from agent_core.model_router import ModelRouter
from agent_core.ollama_client import OllamaClient, OllamaClientError
from agent_core.stream_errors import format_ollama_client_error
from agent_core.planner import Planner
from agent_core.prompt_builder import PromptBuilder
from agent_core.query_preprocessor import QueryPreprocessor, TaskIntent
from agent_core.tool_budget import ToolExecutionBudget
from agent_core.turn_router import ConversationState, RoutingDecision
from agent_core.intent_gates import (
    cert_create_clarification,
    filter_tools_for_intent,
    filter_tools_preview_first,
    is_greeting,
    tool_allowed_for_intent,
)
from agent_core.recovery_loop import RecoveryLoop
from agent_core.reflection_loop import ReflectionLoop
from agent_core.replanning_loop import ReplanningLoop
from agent_core.schemas import (
    AgentConfig,
    AgentMode,
    AgentProduct,
    AgentRunResult,
    AgentStreamRequest,
    StepEvent,
    StreamEvent,
    TaskKind,
    ToolCallRequest,
    VerifyResult,
)
from agent_core.stream_bridge import emit_approval_required, emit_done, emit_step_event
from agent_core.self_healing import SelfHealing
from agent_core.tool_calling import extract_tool_calls, specs_to_ollama_tools
from agent_core.tool_registry import ToolRegistry

from agent_core.task_queue import ACTIVE_TURNS_KEY_PREFIX

log = structlog.get_logger(__name__)

AGENT_CONTEXT_WINDOW_TOKENS = "AGENT_CONTEXT_WINDOW_TOKENS"


def build_session_context_meta(
    *,
    system: str = "",
    user_prompt: str = "",
    history: list[dict[str, str]] | None = None,
    reply: str = "",
) -> dict[str, Any]:
    """Approximate session token usage for UI context meter."""
    hist = history or []
    hist_text = "\n".join(
        f"{item.get('role', 'user')}: {item.get('content', '')}" for item in hist[-40:]
    )
    tokens = (
        estimate_tokens(system)
        + estimate_tokens(user_prompt)
        + estimate_tokens(hist_text)
        + estimate_tokens(reply)
    )
    limit = resolve_int_env(AGENT_CONTEXT_WINDOW_TOKENS, profile_default=8192)
    user_turns = sum(1 for item in hist if item.get("role") == "user")
    return {
        "context_tokens": tokens,
        "context_limit": limit,
        "turn_count": user_turns + 1,
    }


_TURN_SEMAPHORE: asyncio.Semaphore | None = None
TURN_LOCK_KEY_PREFIX = "agent:turn_lock:"


def _turn_semaphore() -> asyncio.Semaphore:
    global _TURN_SEMAPHORE
    if _TURN_SEMAPHORE is None:
        limit = resolve_int_env(AGENT_MAX_CONCURRENT_TURNS, profile_default=4)
        _TURN_SEMAPHORE = asyncio.Semaphore(max(1, limit))
    return _TURN_SEMAPHORE


def _active_turns_key(tenant_id: str) -> str:
    return f"{ACTIVE_TURNS_KEY_PREFIX}{tenant_id}"


def _turn_lock_key(session_id: str) -> str:
    return f"{TURN_LOCK_KEY_PREFIX}{session_id}"


async def _redis_incr(redis_client: Any, key: str) -> None:
    if redis_client is None:
        return
    try:
        if hasattr(redis_client, "incr"):
            maybe = redis_client.incr(key)
            if asyncio.iscoroutine(maybe):
                await maybe
            return
    except Exception as exc:
        log.warning("agent_active_turns_incr_failed", key=key, error=str(exc))


async def _redis_decr(redis_client: Any, key: str) -> None:
    if redis_client is None:
        return
    try:
        if hasattr(redis_client, "decr"):
            maybe = redis_client.decr(key)
            if asyncio.iscoroutine(maybe):
                await maybe
            return
    except Exception as exc:
        log.warning("agent_active_turns_decr_failed", key=key, error=str(exc))


async def _acquire_turn_lock(redis_client: Any, session_id: str) -> bool:
    if redis_client is None:
        return True
    key = _turn_lock_key(session_id)
    try:
        if hasattr(redis_client, "set"):
            maybe = redis_client.set(key, "1", nx=True, ex=60)
            if asyncio.iscoroutine(maybe):
                result = await maybe
            else:
                result = maybe
            return bool(result)
    except Exception as exc:
        log.warning("agent_turn_lock_failed", session_id=session_id, error=str(exc))
    return True


async def _release_turn_lock(redis_client: Any, session_id: str) -> None:
    if redis_client is None:
        return
    key = _turn_lock_key(session_id)
    try:
        if hasattr(redis_client, "delete"):
            maybe = redis_client.delete(key)
            if asyncio.iscoroutine(maybe):
                await maybe
    except Exception as exc:
        log.warning("agent_turn_lock_release_failed", session_id=session_id, error=str(exc))


CHAT_CONCISE_ADDENDUM = (
    "\n\nKeep conversational replies concise — 1-3 sentences unless the user explicitly asks for detail."
)

_CHAT_SYSTEM_FALLBACK = (
    "You are Cleo, a friendly assistant for certificate design. "
    "Reply briefly and warmly to greetings and small talk. Do not use tools. "
    "Keep replies under 30 words."
)


def chat_system_prompt() -> str:
    from agent_core.prompt_loader import load_prompt

    return load_prompt("chat_system_v1.md", fallback=_CHAT_SYSTEM_FALLBACK)


def skip_heavy_post_processing(
    *,
    conversational_turn: bool,
    routing_decision: RoutingDecision | None,
) -> bool:
    """Chat/greeting turns skip critic, memory *retrieval* embed, and full persona stack.

    Sprint-2 / issue #2 — documented behavior (not a silent drop of session writes):
    - SKIP when True: semantic ``search_facts`` (``skip_for_chat``), negative-feedback
      hints, reflection/critic loop, heavy system-persona assembly on the chat path.
    - ALWAYS still run: ``memory.append_turn`` (session transcript) and episode
      summary attempts after the reply — see ``_run_streaming_inner`` post-reply block.
    So chat fast-path reduces *retrieval quality / cost*, it does **not** skip
    persisting the turn. Durable fact extraction remains write-policy gated elsewhere.
    """
    if conversational_turn:
        return True
    if routing_decision is None:
        return False
    return (
        routing_decision.state == ConversationState.chat
        or routing_decision.path == "chat"
    )


def num_predict_for_turn(
    *,
    conversational_turn: bool,
    routing_decision: RoutingDecision | None,
    mode: AgentMode,
) -> int:
    """Cap generation length by routing path (Path-C discipline for ask).

    Defaults (WL-078): chat=50, ask=256, plan/agent=600.
    See ``docs/audits/CLEO-SAGE-ADOPTION-SPRINTS-2026-07-14.md``.
    """
    if conversational_turn:
        return 50
    if routing_decision is not None:
        if routing_decision.path == "chat":
            return 50
        if routing_decision.path == "ask":
            return 256
        if routing_decision.path in ("plan", "agent"):
            return 600
    if mode == AgentMode.plan:
        return 600
    if mode == AgentMode.ask:
        return 256
    return 600


MAX_TOOL_CORRECTION_RETRIES = 2

# DEPRECATED: regex markup fallback when native/JSON tool calls are unavailable.
_TOOL_RE = re.compile(
    r"\[TOOL:(?P<name>\w+)\]\s*(?P<args>\{[^\[]*?)\s*\[/TOOL\]",
    re.DOTALL | re.IGNORECASE,
)
_THOUGHT_RE = re.compile(r"\[THOUGHT\](.*?)\[/THOUGHT\]", re.DOTALL | re.IGNORECASE)
_ACTION_RE = re.compile(r"\[ACTION\](?P<payload>\{.*?\})\[/ACTION\]", re.DOTALL | re.IGNORECASE)
_STEP_RE = re.compile(r"\[STEP\s+(\d+)\]\s*(.+)", re.IGNORECASE)
_PLAN_COMPLETE_RE = re.compile(r"\[PLAN_COMPLETE\]", re.IGNORECASE)


def _extract_actions(text: str) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    for match in _ACTION_RE.finditer(text):
        try:
            payload = json.loads(match.group("payload"))
            if isinstance(payload, dict):
                actions.append(payload)
        except json.JSONDecodeError:
            log.warning("agent_action_parse_error")
    return actions


def _scan_new_actions(buffer: str, emitted: set[str]) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    for match in _ACTION_RE.finditer(buffer):
        block = match.group(0)
        if block in emitted:
            continue
        emitted.add(block)
        try:
            payload = json.loads(match.group("payload"))
            if isinstance(payload, dict):
                found.append(payload)
        except json.JSONDecodeError:
            pass
    return found


def _detect_tool_missed(text: str, registry: ToolRegistry) -> list[str]:
    missed: list[str] = []
    if _TOOL_RE.search(text):
        return missed
    for spec in registry.list_specs():
        if re.search(rf"\b{re.escape(spec.name)}\b", text, re.IGNORECASE):
            missed.append(spec.name)
    return missed


class AgentContext(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    tenant_id: str
    user_id: str
    product: AgentProduct
    session_id: str
    db: Any = None
    extra: dict[str, Any] = Field(default_factory=dict)


class AgentRunner:
    def __init__(
        self,
        *,
        registry: ToolRegistry,
        llm: OllamaClient,
        router: ModelRouter,
        memory: MemoryService,
        guardrails: Guardrails,
        prompt_builder: PromptBuilder,
        config: AgentConfig,
        preprocessor: QueryPreprocessor | None = None,
        output_guardrails: OutputGuardrails | None = None,
        audit_logger: AgentAuditLogger | None = None,
        max_iterations: int | None = None,
        use_native_tools: bool = False,
        tool_timeout_sec: float | None = None,
    ) -> None:
        self.registry = registry
        self.llm = llm
        self.router = router
        self.memory = memory
        self.guardrails = guardrails
        self.prompt_builder = prompt_builder
        self.config = config
        self.preprocessor = preprocessor
        self.output_guardrails = output_guardrails or OutputGuardrails()
        self.audit_logger = audit_logger
        self.max_iterations = max_iterations or config.max_turns
        self.use_native_tools = use_native_tools

        self._planner = Planner(llm=llm, router=router)
        self._executor = Executor(
            registry=registry,
            allowed_tools=registry.allowed_for_mode("agent", config.tool_names or None),
            timeout_sec=float(tool_timeout_sec or DEFAULT_TOOL_TIMEOUT_SEC),
        )
        self._critic = Critic(llm=llm, router=router)
        self._reflection = ReflectionLoop(llm=llm, router=router)
        self._recovery = RecoveryLoop()
        self._replanning = ReplanningLoop(planner=self._planner)
        self._self_healing = SelfHealing(
            recovery=self._recovery,
            critic=self._critic,
            replanner=self._replanning,
        )

    async def run(
        self,
        request: AgentStreamRequest,
        *,
        ctx: AgentContext,
        system_prompt: str,
    ) -> AsyncIterator[dict[str, Any]]:
        async for event in self.run_streaming(request, ctx=ctx, system_prompt=system_prompt):
            yield event.to_sse_dict() if isinstance(event, StreamEvent) else event

    async def run_streaming(
        self,
        request: AgentStreamRequest,
        *,
        ctx: AgentContext,
        system_prompt: str,
        routing_decision: RoutingDecision | None = None,
        turn_timing: Any | None = None,
    ) -> AsyncIterator[StreamEvent]:
        sem = _turn_semaphore()
        timeout_sec = float(resolve_int_env(AGENT_TURN_QUEUE_TIMEOUT_SEC, profile_default=30))
        acquired = False
        try:
            await asyncio.wait_for(sem.acquire(), timeout=timeout_sec)
            acquired = True
        except asyncio.TimeoutError:
            yield StreamEvent(
                event="error",
                text="Server busy, please try again",
                error=True,
            )
            yield StreamEvent(event="done")
            return

        redis_client = ctx.extra.get("redis")
        if not await _acquire_turn_lock(redis_client, ctx.session_id):
            sem.release()
            yield StreamEvent(
                event="error",
                text="A turn is already in progress for this session",
            )
            yield StreamEvent(event="done")
            return

        from agent_core.rate_limiter import check_stream_rate_limit

        allowed_rate, retry_after = await check_stream_rate_limit(redis_client, ctx.tenant_id)
        if not allowed_rate:
            await _release_turn_lock(redis_client, ctx.session_id)
            if acquired:
                sem.release()
            wait = int(retry_after) if retry_after else 1
            yield StreamEvent(
                event="error",
                text=f"Rate limit exceeded. Retry after {wait}s",
                error=True,
            )
            yield StreamEvent(event="done")
            return

        await _redis_incr(redis_client, _active_turns_key(ctx.tenant_id))
        try:
            async for event in self._run_streaming_inner(
                request,
                ctx=ctx,
                system_prompt=system_prompt,
                routing_decision=routing_decision,
                turn_timing=turn_timing,
            ):
                yield event
        finally:
            await _redis_decr(redis_client, _active_turns_key(ctx.tenant_id))
            await _release_turn_lock(redis_client, ctx.session_id)
            if acquired:
                sem.release()

    async def _run_streaming_inner(
        self,
        request: AgentStreamRequest,
        *,
        ctx: AgentContext,
        system_prompt: str,
        routing_decision: RoutingDecision | None = None,
        turn_timing: Any | None = None,
    ) -> AsyncIterator[StreamEvent]:
        started = time.perf_counter()
        mode = request.mode
        tools_called: list[str] = []
        tool_results_summary: list[str] = []
        intent_label = "unknown"
        intent_enum = TaskIntent.unknown
        error_text: str | None = None
        self._executor._budget = ToolExecutionBudget()
        route = self.router.route(
            TaskKind.planning if mode == AgentMode.plan else TaskKind.agent_loop
        )
        model_used = route.model
        reply_max_tokens = self.config.max_tokens

        if not self.config.enabled:
            yield StreamEvent(event="message", text="Agent platform is temporarily disabled.")
            yield StreamEvent(event="done")
            self._executor._budget = None
            return

        guard = self.guardrails.validate_user_input(request.prompt)
        detected_language = None
        try:
            from agent_core.language_detect import detect_language

            detected_language = detect_language(guard.sanitized_prompt)
        except Exception:
            detected_language = None
        log.info(
            "agent_turn_start",
            tenant_id=ctx.tenant_id,
            session_id=ctx.session_id,
            mode=mode.value,
            detected_language=detected_language,
        )
        if not guard.allowed:
            yield StreamEvent(event="message", text=f"Request blocked: {guard.reason}")
            await self._write_audit(
                ctx=ctx,
                mode=mode,
                intent_label=intent_label,
                system_prompt=system_prompt,
                user_prompt=guard.sanitized_prompt,
                tools_called=tools_called,
                started=started,
                model_used=model_used,
                error_text=guard.reason,
            )
            yield StreamEvent(event="done")
            self._executor._budget = None
            return

        user_for_prompt = guard.sanitized_prompt
        session_caps = resolve_session_capabilities(
            request_context=request.context,
            web_search_enabled=request.web_search_enabled,
            url_fetch_enabled=request.url_fetch_enabled,
            debug_mode=request.debug_mode or bool((request.context or {}).get("debug_mode")),
            attachments=request.attachments,
        )
        internet_audit: dict[str, list[str]] = {"search_queries": [], "external_urls_fetched": []}

        if request.attachments:
            augmented, _blocks = await preprocess_attachments(
                request,
                ollama_client=self.llm,
                redis_client=ctx.extra.get("redis"),
                pdf_celery_dispatch=ctx.extra.get("pdf_celery_dispatch"),
                tenant_id=ctx.tenant_id,
            )
            user_for_prompt = augmented[:4000]

        if routing_decision is not None and routing_decision.capabilities_text:
            yield StreamEvent(event="message", text=routing_decision.capabilities_text)
            await self._write_audit(
                ctx=ctx,
                mode=mode,
                intent_label=routing_decision.intent.value,
                system_prompt=system_prompt,
                user_prompt=guard.sanitized_prompt,
                tools_called=tools_called,
                started=started,
                model_used=model_used,
                error_text=None,
            )
            yield StreamEvent(event="done")
            self._executor._budget = None
            return

        preprocessed_applied = routing_decision is not None
        if preprocessed_applied and routing_decision.preprocessed is not None:
            pre = routing_decision.preprocessed
            intent_label = pre.intent.value
            intent_enum = pre.intent
            if pre.confidence >= 0.5:
                user_for_prompt = pre.rewritten
            yield StreamEvent(
                event="preprocessed",
                intent=pre.intent.value,
                suggested_mode=pre.suggested_mode if pre.confidence >= 0.85 else None,
                confidence=pre.confidence,
                text=pre.rewritten if pre.confidence >= 0.5 else guard.sanitized_prompt,
            )
            if intent_enum == TaskIntent.create:
                clarify = cert_create_clarification(guard.sanitized_prompt)
                if clarify:
                    log.info(
                        "cert_create_clarification",
                        missing=clarify.get("missing_fields"),
                        intent=intent_label,
                    )
                    yield StreamEvent(event="message", text=str(clarify.get("message") or clarify.get("question")))
                    yield clarify
                    await self._write_audit(
                        ctx=ctx,
                        mode=mode,
                        intent_label=intent_label,
                        system_prompt=system_prompt,
                        user_prompt=guard.sanitized_prompt,
                        tools_called=tools_called,
                        started=started,
                        model_used=model_used,
                        error_text=None,
                    )
                    yield StreamEvent(event="done")
                    return
        elif routing_decision is not None:
            intent_label = routing_decision.intent.value
            intent_enum = routing_decision.intent
        elif self.preprocessor is not None and mode == AgentMode.agent:
            pre = await self.preprocessor.preprocess(
                guard.sanitized_prompt,
                product_context=self.config.product.value,
            )
            intent_label = pre.intent.value
            intent_enum = pre.intent
            if pre.confidence >= 0.5:
                user_for_prompt = pre.rewritten
            yield StreamEvent(
                event="preprocessed",
                intent=pre.intent.value,
                suggested_mode=pre.suggested_mode if pre.confidence >= 0.85 else None,
                confidence=pre.confidence,
                text=pre.rewritten if pre.confidence >= 0.5 else guard.sanitized_prompt,
            )
            if intent_enum == TaskIntent.create:
                clarify = cert_create_clarification(guard.sanitized_prompt)
                if clarify:
                    log.info(
                        "cert_create_clarification",
                        missing=clarify.get("missing_fields"),
                        intent=intent_label,
                    )
                    yield StreamEvent(event="message", text=str(clarify.get("message") or clarify.get("question")))
                    yield clarify
                    await self._write_audit(
                        ctx=ctx,
                        mode=mode,
                        intent_label=intent_label,
                        system_prompt=system_prompt,
                        user_prompt=guard.sanitized_prompt,
                        tools_called=tools_called,
                        started=started,
                        model_used=model_used,
                        error_text=None,
                    )
                    yield StreamEvent(event="done")
                    return

        conversational_turn = (
            routing_decision is not None
            and (
                routing_decision.path == "chat"
                or routing_decision.state == ConversationState.chat
                or routing_decision.intent == TaskIntent.conversational
            )
        )
        if not conversational_turn:
            conversational_turn = intent_enum == TaskIntent.conversational
        if not conversational_turn and is_greeting(guard.sanitized_prompt):
            conversational_turn = True
            intent_enum = TaskIntent.conversational
            intent_label = intent_enum.value
        if conversational_turn:
            route = self.router.route(TaskKind.chat_fast)
            model_used = route.model
            reply_max_tokens = num_predict_for_turn(
                conversational_turn=True,
                routing_decision=routing_decision,
                mode=mode,
            )
        else:
            reply_max_tokens = num_predict_for_turn(
                conversational_turn=False,
                routing_decision=routing_decision,
                mode=mode,
            )
            reply_max_tokens = min(reply_max_tokens, self.config.max_tokens)

        if turn_timing is not None:
            turn_timing.num_predict = reply_max_tokens

        stream_temperature = self.config.temperature
        try:
            from agent_core.language_detect import is_indic_language

            if is_indic_language(detected_language):
                reply_max_tokens = max(reply_max_tokens, 3072)
                stream_temperature = min(stream_temperature, 0.35)
        except Exception:
            pass

        history = await self.memory.get_session_messages(
            tenant_id=ctx.tenant_id,
            session_id=ctx.session_id,
            product=ctx.product,
            max_turns=resolve_int_env(AGENT_MAX_HISTORY_TURNS, profile_default=20),
        )
        if request.messages:
            history = history + request.messages

        mem_t0 = time.perf_counter()
        skip_mem = skip_heavy_post_processing(
            conversational_turn=conversational_turn,
            routing_decision=routing_decision,
        )
        memory_facts = await self.memory.search_facts(
            tenant_id=ctx.tenant_id,
            product=ctx.product,
            query=user_for_prompt,
            limit=5,
            skip_for_chat=skip_mem,
        )
        if turn_timing is not None:
            turn_timing.mark_memory(mem_t0)
            if skip_mem:
                turn_timing.t_memory_ms = 0.0
        prompt_context = dict(request.context)
        prompt_context.update(capabilities_to_context(session_caps))
        if memory_facts:
            # Sprint-4 #43: RAG memory is untrusted — same delimiter treatment as tool results.
            prompt_context["relevant_memory"] = self.guardrails.wrap_memory_context(memory_facts)
        if not skip_mem:
            avoid = await self.memory.search_negative_feedback_hints(
                tenant_id=ctx.tenant_id,
                product=ctx.product,
                intent=intent_label,
                limit=3,
            )
            if avoid:
                prompt_context["avoid_patterns"] = avoid

        allowed = self.registry.allowed_for_mode("agent", self.config.tool_names or None)
        tool_specs = (
            [s for s in self.registry.list_specs() if s.name in allowed]
            if mode == AgentMode.agent and not conversational_turn
            else []
        )
        if mode == AgentMode.agent and self.config.include_internet_tools:
            tool_specs = filter_tool_specs_for_session(tool_specs, session_caps)

        if mode == AgentMode.agent and self.preprocessor is not None:
            allowed_names = filter_tools_for_intent(intent_enum, {s.name for s in tool_specs})
            if allowed_names != {s.name for s in tool_specs}:
                tool_specs = [s for s in tool_specs if s.name in allowed_names]
                log.info(
                    "intent_tool_gate",
                    intent=intent_label,
                    tools=[s.name for s in tool_specs],
                )

        preview_first = bool((request.context or {}).get("preview_first"))
        if mode == AgentMode.agent and preview_first and tool_specs:
            preview_allowed = filter_tools_preview_first({s.name for s in tool_specs})
            tool_specs = [s for s in tool_specs if s.name in preview_allowed]
            log.info("preview_first_tool_gate", tools=[s.name for s in tool_specs])

        internet_addendum = (
            INTERNET_SEARCH_RULES_ENABLED
            if session_caps.web_search_enabled
            else INTERNET_SEARCH_RULES_DISABLED
        )
        if skip_heavy_post_processing(
            conversational_turn=conversational_turn,
            routing_decision=routing_decision,
        ):
            effective_system = chat_system_prompt()
        else:
            effective_system = f"{system_prompt.rstrip()}\n\n{internet_addendum}"
            if preview_first:
                effective_system = (
                    f"{effective_system}\n\n"
                    "This request is ambiguous: call get_template_info or preview_certificate "
                    "first to read context, then propose changes. Do not mutate until previewed."
                )
            if conversational_turn:
                effective_system = f"{effective_system}{CHAT_CONCISE_ADDENDUM}"

        routing_path = routing_decision.path if routing_decision is not None else None
        system, user_prompt = self.prompt_builder.build_agent_prompt(
            system=effective_system,
            history=history,
            user_message=user_for_prompt,
            context=prompt_context,
            tool_specs=tool_specs,
            mode=mode,
            routing_path=routing_path,
        )

        if not conversational_turn and routing_decision is not None and routing_decision.path == "plan":
            yield StreamEvent(event="thought", text="Thinking…")
        elif not conversational_turn and routing_decision is None:
            yield StreamEvent(event="thought", text="Thinking…")

        if (
            mode == AgentMode.agent
            and self.config.enable_loop_planning
            and not conversational_turn
            and routing_decision is None
        ):
            try:
                plan = await self._planner.create_plan(goal=user_for_prompt, context=prompt_context)
                for step in plan.steps:
                    yield StreamEvent(event="plan_step", step=step.step, text=step.text)
                if plan.steps:
                    yield StreamEvent(event="plan_complete", text=plan.raw[:4000])
            except Exception as exc:
                log.warning("agent_inline_plan_failed", error=str(exc))

        full_reply = ""
        emitted_actions: set[str] = set()
        turns = 0
        ollama_tools = specs_to_ollama_tools(tool_specs) if tool_specs and self.use_native_tools else None
        confirm_tools = self._self_healing.tools_requiring_confirmation(
            {s.name for s in tool_specs}
        )

        try:
            if mode == AgentMode.agent and self.use_native_tools and ollama_tools:
                completion = await self.llm.complete_chat(
                    system=system,
                    prompt=user_prompt,
                    model=route.model,
                    temperature=stream_temperature,
                    max_tokens=reply_max_tokens,
                    tools=ollama_tools,
                    task_kind=route.task_kind,
                )
                full_reply = completion.content or ""
                if full_reply:
                    for ch in full_reply:
                        yield StreamEvent(event="token", text=ch)
                native_calls = completion.tool_calls
            else:
                native_calls = None
                async for token in self._stream_llm(
                    system=system,
                    prompt=user_prompt,
                    route=route,
                    max_tokens=reply_max_tokens,
                    temperature=stream_temperature,
                ):
                    full_reply += token
                    yield StreamEvent(event="token", text=token)
                    for action in _scan_new_actions(full_reply, emitted_actions):
                        safe = self.guardrails.sanitize_actions([action])
                        for item in safe:
                            yield StreamEvent(event="action", action=item)
        except OllamaClientError as exc:
            log.warning("agent_llm_error", error=str(exc), tenant_id=ctx.tenant_id)
            error_text = format_ollama_client_error(exc)
            yield StreamEvent(event="error", text=error_text)
            await self._write_audit(
                ctx=ctx,
                mode=mode,
                intent_label=intent_label,
                system_prompt=system_prompt,
                user_prompt=guard.sanitized_prompt,
                tools_called=tools_called,
                started=started,
                model_used=model_used,
                error_text=error_text,
                internet_audit=internet_audit,
                search_enabled=session_caps.web_search_enabled,
            )
            yield StreamEvent(event="done")
            self._executor._budget = None
            return

        if mode == AgentMode.plan:
            async for ev in self._emit_plan_events(full_reply):
                yield ev
            await self._write_audit(
                ctx=ctx,
                mode=mode,
                intent_label=intent_label,
                system_prompt=system_prompt,
                user_prompt=guard.sanitized_prompt,
                tools_called=tools_called,
                started=started,
                model_used=model_used,
                error_text=error_text,
                internet_audit=internet_audit,
                search_enabled=session_caps.web_search_enabled,
            )
            yield StreamEvent(event="done")
            self._executor._budget = None
            return

        if mode == AgentMode.ask:
            talk = _strip_markup(full_reply)
            output_guard = self.output_guardrails.validate(
                talk,
                mode=mode,
                registry=self.registry,
                max_words=self.config.max_output_words,
            )
            input_guard = self.guardrails.validate_agent_output(talk)
            if not output_guard.allowed or not input_guard.allowed:
                yield StreamEvent(event="message", text="I cannot provide that response.")
            elif talk:
                yield StreamEvent(event="message", text=output_guard.sanitized_text)
            await self._write_audit(
                ctx=ctx,
                mode=mode,
                intent_label=intent_label,
                system_prompt=system_prompt,
                user_prompt=guard.sanitized_prompt,
                tools_called=tools_called,
                started=started,
                model_used=model_used,
                error_text=error_text,
                internet_audit=internet_audit,
                search_enabled=session_caps.web_search_enabled,
            )
            yield StreamEvent(event="done")
            self._executor._budget = None
            return

        exec_context = {
            "tenant_id": ctx.tenant_id,
            "user_id": ctx.user_id,
            "session_id": ctx.session_id,
            "db": ctx.db,
            "session_capabilities": session_caps.model_dump(),
            "web_search_enabled": session_caps.web_search_enabled,
            "url_fetch_enabled": session_caps.url_fetch_enabled,
            "_internet_audit": internet_audit,
            **ctx.extra,
        }

        while turns < self.max_iterations:
            tool_call_models, parse_source = extract_tool_calls(
                text=full_reply,
                native_calls=native_calls if turns == 0 else None,
            )
            if not tool_call_models and turns == 0 and self.use_native_tools and ollama_tools:
                try:
                    completion = await self.llm.complete_chat(
                        system=system,
                        prompt=user_prompt,
                        model=route.model,
                        temperature=self.config.temperature,
                        max_tokens=self.config.max_tokens,
                        tools=ollama_tools,
                    )
                    tool_call_models, parse_source = extract_tool_calls(
                        text=completion.content or "",
                        native_calls=completion.tool_calls,
                    )
                    if completion.content and not full_reply:
                        full_reply = completion.content
                        for ch in completion.content:
                            yield StreamEvent(event="token", text=ch)
                except OllamaClientError:
                    pass

            if not tool_call_models:
                missed = _detect_tool_missed(full_reply, self.registry)
                if missed:
                    for missed_name in missed:
                        yield StreamEvent(
                            event="tool_missed",
                            name=missed_name,
                            text=(
                                f"Model may have intended to call {missed_name} "
                                "but tool syntax was missing."
                            ),
                        )
                    attempts = int(exec_context.get("_tool_syntax_correction_attempts", 0))
                    if attempts < MAX_TOOL_CORRECTION_RETRIES:
                        exec_context["_tool_syntax_correction_attempts"] = attempts + 1
                        correction = (
                            "Your previous reply referenced tools "
                            f"{', '.join(missed)} without valid tool calls. "
                            "Call exactly one registered tool with valid JSON arguments, "
                            "or answer in plain language without tools."
                        )
                        full_reply = ""
                        try:
                            async for token in self._stream_llm(
                                system=system_prompt,
                                prompt=correction,
                                route=route,
                                max_tokens=min(reply_max_tokens, 400),
                            ):
                                full_reply += token
                                yield StreamEvent(
                                    event="token",
                                    text=self.guardrails.sanitize_user_facing_output(token),
                                )
                        except OllamaClientError:
                            break
                        continue
                break

            log.debug("agent_tool_calls_parsed", source=parse_source, count=len(tool_call_models))
            batch_calls = [
                ToolCallRequest(name=c.name, arguments=c.arguments) for c in tool_call_models
            ]
            batch_results: list[str] = []
            exec_results = []

            for call in batch_calls:
                if turns >= self.max_iterations:
                    break
                if not self.guardrails.is_tool_allowed(call.name, mode=mode):
                    result = json.dumps({"error": "tool_not_allowed", "tool": call.name})
                    tool_results_summary.append(f"{call.name}:denied")
                    yield StreamEvent(event="tool", name=call.name, text=f"Running {call.name}…")
                    yield StreamEvent(event="tool_result", name=call.name, text=result, error=True)
                    safe_result = self.guardrails.wrap_tool_result(result, tool_name=call.name)
                    batch_results.append(f"Tool {call.name} result:\n{safe_result}")
                    continue

                if not tool_allowed_for_intent(intent_enum, call.name):
                    result = json.dumps({"error": "intent_gate_blocked", "tool": call.name, "intent": intent_label})
                    tool_results_summary.append(f"{call.name}:intent_blocked")
                    yield StreamEvent(event="tool", name=call.name, text=f"Running {call.name}…")
                    yield StreamEvent(event="tool_result", name=call.name, text=result, error=True)
                    safe_result = self.guardrails.wrap_tool_result(result, tool_name=call.name)
                    batch_results.append(f"Tool {call.name} result:\n{safe_result}")
                    continue

                turns += 1
                tools_called.append(call.name)
                yield StreamEvent(event="tool", name=call.name, text=f"Running {call.name}…")

                exec_result = await self._executor.execute_one(
                    call,
                    ctx=ctx,
                    context=exec_context,
                    require_confirmation=confirm_tools,
                )
                exec_results.append(exec_result)
                result = exec_result.result
                if exec_result.ok:
                    tool_results_summary.append(f"{call.name}:ok:{result[:240]}")
                    yield StreamEvent(event="tool_result", name=call.name, text=result[:500])
                else:
                    tool_results_summary.append(
                        f"{call.name}:failed:{exec_result.error or 'error'}"[:160]
                    )
                    yield StreamEvent(
                        event="tool_result",
                        name=call.name,
                        text=result,
                        error=True,
                    )
                safe_result = self.guardrails.wrap_tool_result(result, tool_name=call.name)
                batch_results.append(f"Tool {call.name} result:\n{safe_result}")

            if not batch_results:
                break

            full_reply = _TOOL_RE.sub("", full_reply).strip()
            native_calls = None

            healing = await self._self_healing.heal_tool_batch(
                exec_results,
                user_goal=user_for_prompt,
                agent_draft=full_reply,
            )
            recovery_hint = healing.recovery.hint_for_llm
            if healing.should_replan:
                replan = await self._replanning.replan(
                    goal=user_for_prompt,
                    failure_reason=recovery_hint or "Tool failures",
                    context=prompt_context,
                )
                for step in replan.plan.steps[:3]:
                    yield StreamEvent(event="plan_step", step=step.step, text=step.text)

            follow_up = (
                "\n\n".join(batch_results)
                + (f"\n\nRecovery guidance: {recovery_hint}" if recovery_hint else "")
                + "\n\nContinue helping the user. Use tools only if still needed."
            )
            continuation = ""
            try:
                async for token in self._stream_llm(
                    system=system_prompt,
                    prompt=follow_up,
                    route=route,
                    temperature=max(0.1, self.config.temperature - 0.1),
                ):
                    continuation += token
                    full_reply += token
                    yield StreamEvent(event="token", text=token)
                    for action in _scan_new_actions(full_reply, emitted_actions):
                        safe = self.guardrails.sanitize_actions([action])
                        for item in safe:
                            yield StreamEvent(event="action", action=item)
            except OllamaClientError as exc:
                error_text = format_ollama_client_error(exc)
                yield StreamEvent(event="error", text=error_text)
                break

        for action in _extract_actions(full_reply):
            block = json.dumps(action, sort_keys=True)
            if block not in emitted_actions:
                safe = self.guardrails.sanitize_actions([action])
                for item in safe:
                    yield StreamEvent(event="action", action=item)

        thought_match = _THOUGHT_RE.search(full_reply)
        if thought_match:
            yield StreamEvent(event="thought", text=thought_match.group(1).strip())

        talk = _strip_markup(full_reply)
        output_guard = self.output_guardrails.validate(
            talk,
            mode=mode,
            registry=self.registry,
            max_words=self.config.max_output_words,
        )
        input_guard = self.guardrails.validate_agent_output(talk)

        skip_reflection = skip_heavy_post_processing(
            conversational_turn=conversational_turn,
            routing_decision=routing_decision,
        )
        reflection_enabled = (
            not skip_reflection
            and resolve_bool_env(AGENT_REFLECTION_ENABLED, profile_default=True)
        )
        if reflection_enabled:
            reflection = await self._reflection.reflect(
                user_goal=user_for_prompt,
                agent_response=output_guard.sanitized_text or talk,
                tool_summary="\n".join(tool_results_summary),
                max_retries=1,
            )
        else:
            from agent_core.critic import CriticVerdict
            from agent_core.reflection_loop import ReflectionResult

            reflection = ReflectionResult(
                should_retry=False,
                improved_hint="",
                critic=CriticVerdict(
                    approved=True,
                    issues=[],
                    suggestion="",
                    raw={},
                    skip_reason="reflection_disabled",
                ),
            )

        if reflection_enabled and reflection.should_retry and reflection.improved_hint:
            yield StreamEvent(event="thought", text=f"Refining: {reflection.improved_hint[:200]}")

        if reflection.critic.skip_reason == "critic_unavailable":
            final_content = (output_guard.sanitized_text or talk) if talk else ""
            if talk:
                yield StreamEvent(
                    event="message",
                    text=output_guard.sanitized_text or talk,
                )
            else:
                yield StreamEvent(
                    event="message",
                    text=(
                        "I'm unable to verify this response right now. "
                        "Please try again or rephrase your question."
                    ),
                )
        elif not output_guard.allowed or not input_guard.allowed:
            yield StreamEvent(event="message", text="I cannot provide that response.")
            final_content = ""
        elif talk:
            from agent_core.citation_gate import (
                CITE_RETRY_INSTRUCTION,
                citation_required_enabled,
                needs_citation_retry,
                score_org_citation,
            )

            org_hits = (request.context or {}).get("org_knowledge_hits") or []
            hit_count = (
                len(org_hits)
                if isinstance(org_hits, list)
                else int((request.context or {}).get("org_knowledge_count") or 0)
            )
            product_name = str(
                getattr(ctx.product, "value", None)
                or ctx.product
                or (request.context or {}).get("product")
                or ""
            )
            final_text = output_guard.sanitized_text or talk
            if citation_required_enabled(
                product=product_name, context=request.context or {}
            ) and needs_citation_retry(final_text, hit_count=hit_count):
                yield StreamEvent(event="thought", text="Citing org_knowledge sources…")
                cite_prompt = (
                    f"{user_for_prompt}\n\n{CITE_RETRY_INSTRUCTION}\n\n"
                    f"Draft to fix:\n{final_text[:4000]}"
                )
                retry_buf = ""
                try:
                    async for token in self._stream_llm(
                        system=system_prompt,
                        prompt=cite_prompt,
                        route=route,
                        temperature=0.1,
                    ):
                        retry_buf += token
                except OllamaClientError:
                    retry_buf = ""
                if retry_buf.strip():
                    final_text = self.output_guardrails.validate(
                        _strip_markup(retry_buf),
                        mode=mode,
                        registry=self.registry,
                        max_words=self.config.max_output_words,
                    ).sanitized_text or _strip_markup(retry_buf)
                cite_score = score_org_citation(final_text, hit_count=hit_count)
                yield StreamEvent(
                    event="thought",
                    text=f"citation_gate:{'ok' if cite_score.get('passed') else 'flagged'}",
                    meta=cite_score,
                )
                if cite_score.get("needs_retry") and not cite_score.get("cited"):
                    final_text = (
                        f"{final_text.rstrip()}\n\n"
                        "[Note: org knowledge was retrieved but citations could not be verified.]"
                    )
            yield StreamEvent(event="message", text=final_text)
            final_content = final_text
        else:
            final_content = ""

        try:
            await self.memory.append_turn(
                tenant_id=ctx.tenant_id,
                user_id=ctx.user_id,
                session_id=ctx.session_id,
                role="user",
                content=guard.sanitized_prompt,
                product=ctx.product,
            )
            if reflection.critic.skip_reason != "critic_unavailable" or final_content:
                await self.memory.append_turn(
                    tenant_id=ctx.tenant_id,
                    user_id=ctx.user_id,
                    session_id=ctx.session_id,
                    role="assistant",
                    content=final_content,
                    product=ctx.product,
                )
        except Exception as exc:
            log.warning("agent_append_turn_failed", error=str(exc)[:300])
        try:
            episode = await self._reflection.summarize_episode(
                user_goal=user_for_prompt,
                final_response=final_content,
            )
            await self.memory.store_episode_summary(
                tenant_id=ctx.tenant_id,
                user_id=ctx.user_id,
                session_id=ctx.session_id,
                product=ctx.product,
                summary=episode,
            )
        except Exception as exc:
            log.warning("episodic_memory_store_failed", error=str(exc))

        await self._write_audit(
            ctx=ctx,
            mode=mode,
            intent_label=intent_label,
            system_prompt=system_prompt,
            user_prompt=guard.sanitized_prompt,
            tools_called=tools_called,
            tool_results_summary="\n".join(tool_results_summary)[:4000],
            started=started,
            model_used=model_used,
            error_text=error_text,
            internet_audit=internet_audit,
            search_enabled=session_caps.web_search_enabled,
        )

        self._executor._budget = None
        yield StreamEvent(
            event="done",
            meta=build_session_context_meta(
                system=system,
                user_prompt=user_prompt,
                history=history,
                reply=final_content,
            ),
        )

    async def run_state_machine(
        self,
        request: AgentStreamRequest,
        *,
        ctx: "AgentContext",
        system_prompt: str,
        job_id: str,
        redis_client: Any = None,
    ) -> None:
        """Sprint 2 state machine: QUEUED → PLANNING → EXECUTING → VERIFYING → DONE.

        Only active when AGENT_PLANNER_ENABLED=true. Falls back to run_streaming otherwise.
        """
        if not PLANNER_ENABLED:
            async for _ in self.run_streaming(request, ctx=ctx, system_prompt=system_prompt):
                pass
            return

        if redis_client is None:
            redis_client = ctx.extra.get("redis")

        run_start = datetime.now(timezone.utc)
        approval_count = 0
        successful_steps = 0
        total_retries = 0

        async def _set_status(status: AgentJobStatus, meta: dict | None = None) -> None:
            if redis_client:
                try:
                    await update_status(redis_client, job_id, status, meta)
                except Exception:
                    pass

        await _set_status(AgentJobStatus.PLANNING)
        try:
            from agent_core.capability_registry import capability_registry
            caps = [
                {
                    "capability_name": c.capability_name,
                    "description": c.description,
                    "requires_approval": c.requires_approval,
                }
                for c in capability_registry.list_all()
            ]
        except Exception:
            caps = []

        try:
            plan_result = await self._planner.plan(
                request.prompt,
                context=dict(request.context),
                available_capabilities=caps,
            )
        except Exception as exc:
            log.warning("state_machine.plan_failed", error=str(exc), job_id=job_id)
            await _set_status(AgentJobStatus.FAILED, {"error": str(exc)[:500]})
            return

        await _set_status(AgentJobStatus.EXECUTING)
        artifacts: list[Any] = []

        for step in plan_result.steps:
            step_dict = {"step_id": step.step_id, "step_name": step.step_name}

            if step.requires_approval and redis_client:
                approval_count += 1
                await _set_status(AgentJobStatus.WAITING_APPROVAL)
                gate = ApprovalGate(redis_client)
                _now = datetime.now(timezone.utc)
                req = ApprovalRequest(
                    job_id=job_id,
                    step_id=step.step_id,
                    step_name=step.step_name,
                    capability_name=step.capability_name,
                    preview_data=step.args_template or {"step": step.step_name},
                    requested_at=_now,
                    expires_at=_now.replace(hour=(_now.hour + 1) % 24),
                )
                await gate.request_approval(req)
                if redis_client:
                    await emit_approval_required(
                        redis_client,
                        job_id,
                        step_dict,
                        req.model_dump(mode="json"),
                    )
                try:
                    decision = await gate.await_decision(job_id, timeout=3600)
                except TimeoutError:
                    log.warning("state_machine.approval_timeout", job_id=job_id, step=step.step_name)
                    await _set_status(AgentJobStatus.FAILED, {"error": "approval_timeout"})
                    return
                if not decision.approved:
                    await _set_status(AgentJobStatus.FAILED, {"error": "approval_rejected"})
                    return
                await _set_status(AgentJobStatus.EXECUTING)

            # Emit running step event
            if redis_client:
                try:
                    await emit_step_event(
                        redis_client,
                        job_id,
                        StepEvent(
                            step_id=step.step_id,
                            step_name=step.step_name,
                            tool_called=step.capability_name or None,
                            status="running",
                            started_at=datetime.now(timezone.utc),
                        ),
                    )
                except Exception:
                    pass

            # Execute step via tool registry if capability is registered
            step_result: dict[str, Any] = {}
            if step.capability_name:
                try:
                    from agent_core.tool_registry import dispatch_mcp
                    raw = await dispatch_mcp(
                        step.capability_name,
                        step.args_template or {},
                        tenant_id=ctx.tenant_id,
                    )
                    step_result = raw if isinstance(raw, dict) else {"result": raw}
                except Exception as exc:
                    step_result = {"error": str(exc)[:500]}
            else:
                step_result = {"info": f"Step '{step.step_name}' has no registered capability"}

            # Verifying
            await _set_status(AgentJobStatus.VERIFYING)
            verify = await self._critic.post_exec_verify(step, step_result)

            if verify.score < 0.6:
                await _set_status(AgentJobStatus.RECOVERING)
                log.warning(
                    "state_machine.step_low_score",
                    job_id=job_id,
                    step=step.step_name,
                    score=verify.score,
                    issues=verify.issues,
                )
                # Re-emit done (with warning) — continue rather than abort
            else:
                successful_steps += 1
                if redis_client:
                    try:
                        await emit_step_event(
                            redis_client,
                            job_id,
                            StepEvent(
                                step_id=step.step_id,
                                step_name=step.step_name,
                                tool_called=step.capability_name or None,
                                status="done",
                                started_at=datetime.now(timezone.utc),
                                result_summary=str(step_result)[:200],
                            ),
                        )
                    except Exception:
                        pass

            artifacts.append({"step": step.step_name, "result": step_result})
            await _set_status(AgentJobStatus.EXECUTING)

        await _set_status(AgentJobStatus.DONE)
        if redis_client:
            try:
                await emit_done(redis_client, job_id, artifacts)
            except Exception:
                pass

        # Emit Langfuse scores — best-effort, never blocks
        try:
            from agent_core.observability import _get_langfuse
            lf = _get_langfuse()
            if lf is not None:
                total_steps = len(plan_result.steps)
                latency = (datetime.now(timezone.utc) - run_start).total_seconds()
                lf.score(
                    trace_id=job_id,
                    name="tool_success_rate",
                    value=successful_steps / total_steps if total_steps > 0 else 0.0,
                )
                lf.score(trace_id=job_id, name="retry_count", value=float(total_retries))
                lf.score(trace_id=job_id, name="approval_gates_triggered", value=float(approval_count))
                lf.score(trace_id=job_id, name="total_latency_seconds", value=latency)
        except Exception as _lf_exc:
            log.debug("langfuse_score_skipped", error=str(_lf_exc))

        # Wire reflection after task completes
        reflection_enabled = resolve_bool_env(AGENT_REFLECTION_ENABLED, profile_default=True)
        if PLANNER_ENABLED and reflection_enabled and self._reflection:
            try:
                await self._reflection.run_reflection(
                    job_id=job_id,
                    goal=request.prompt,
                    steps_completed=len(plan_result.steps),
                    outcome="done",
                    tenant_id=ctx.tenant_id,
                    memory_service=self.memory,
                    stream_bridge=None,
                    redis_client=redis_client,
                )
            except Exception as e:
                log.warning("reflection_loop.failed", error=str(e))  # non-fatal

    async def _write_audit(
        self,
        *,
        ctx: AgentContext,
        mode: AgentMode,
        intent_label: str,
        system_prompt: str,
        user_prompt: str,
        tools_called: list[str],
        started: float,
        model_used: str,
        error_text: str | None,
        tool_results_summary: str = "",
        internet_audit: dict[str, list[str]] | None = None,
        search_enabled: bool = False,
    ) -> None:
        if self.audit_logger is None:
            return
        latency_ms = int((time.perf_counter() - started) * 1000)
        audit_bucket = internet_audit or {}
        await self.audit_logger.log(
            AgentAuditEntry(
                session_id=ctx.session_id,
                tenant_id=ctx.tenant_id,
                product=ctx.product.value,
                user_id=ctx.user_id,
                mode=mode.value,
                intent=intent_label,
                prompt_hash=hash_prompt_for_audit(system_prompt, user_prompt),
                tools_called=tools_called,
                tool_results_summary=tool_results_summary,
                latency_ms=latency_ms,
                model_used=model_used,
                byo_model=bool(getattr(self.llm, "resolved", None) and getattr(self.llm.resolved, "is_byo", False)),
                error=error_text,
                search_queries=list(audit_bucket.get("search_queries") or []),
                external_urls_fetched=list(audit_bucket.get("external_urls_fetched") or []),
                search_enabled=search_enabled,
            )
        )

    async def _stream_llm(
        self,
        *,
        system: str,
        prompt: str,
        route: Any,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        async for token in self.llm.stream_chat(
            system=system,
            prompt=prompt,
            model=route.model,
            temperature=temperature if temperature is not None else self.config.temperature,
            max_tokens=max_tokens if max_tokens is not None else self.config.max_tokens,
            task_kind=route.task_kind,
        ):
            yield token

    async def _emit_plan_events(self, full_reply: str) -> AsyncIterator[StreamEvent]:
        steps = list(_STEP_RE.finditer(full_reply))
        if steps:
            for match in steps:
                yield StreamEvent(
                    event="plan_step",
                    step=int(match.group(1)),
                    text=match.group(2).strip(),
                )
        else:
            for line in full_reply.splitlines():
                cleaned = line.strip()
                if cleaned:
                    yield StreamEvent(event="plan_step", text=cleaned)
        if _PLAN_COMPLETE_RE.search(full_reply) or steps:
            yield StreamEvent(event="plan_complete", text=full_reply.strip()[:4000])

    async def run_to_result(
        self,
        request: AgentStreamRequest,
        *,
        ctx: AgentContext,
        system_prompt: str,
    ) -> AgentRunResult:
        final_message = ""
        tool_calls: list[ToolCallRequest] = []
        turns = 0
        blocked = False
        error: str | None = None
        async for event in self.run_streaming(request, ctx=ctx, system_prompt=system_prompt):
            if event.event == "message" and event.text:
                final_message = event.text
                if event.text.startswith("Request blocked"):
                    blocked = True
            elif event.event == "tool" and event.name:
                tool_calls.append(ToolCallRequest(name=event.name))
                turns += 1
            elif event.event == "error" and event.text:
                error = event.text
        return AgentRunResult(
            session_id=ctx.session_id,
            final_message=final_message,
            tool_calls=tool_calls,
            turns=turns,
            blocked=blocked,
            error=error,
        )


def _strip_markup(text: str) -> str:
    talk = _TOOL_RE.sub("", text)
    talk = _ACTION_RE.sub("", talk)
    talk = _THOUGHT_RE.sub("", talk)
    return talk.strip()
