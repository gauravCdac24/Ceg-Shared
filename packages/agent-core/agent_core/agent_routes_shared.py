"""Shared FastAPI helpers for /v1/agent models and BYO test endpoints."""

from __future__ import annotations

import os
import uuid
from typing import Any

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field

from agent_core.env_resolver import resolve_ollama_base_url
from agent_core.ollama_client import OllamaClient, OllamaClientError
from agent_core.capability_flags import load_capability_flags
from agent_core.tools.url_safety import normalize_url, validate_outbound_url
from agent_core.schemas import AgentAttachment, AgentMode, AgentStreamRequest
from agent_core.tenant_agent_settings import (
    TenantAgentCapabilities,
    parse_tenant_agent_capabilities,
    tenant_capabilities_to_public,
)


def is_agent_enabled(value: str | bool | None = None) -> bool:
    """Return False when AGENT_ENABLED is 0/false/no/off (deployment kill switch)."""
    if value is None:
        value = os.environ.get("AGENT_ENABLED", "true")
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() not in ("0", "false", "no", "off")


def assert_agent_enabled(value: str | bool | None = None) -> None:
    if not is_agent_enabled(value):
        raise HTTPException(status_code=503, detail="Agent platform is temporarily disabled")


class BYOModelConfig(BaseModel):
    base_url: str = Field(min_length=4)
    model: str = Field(min_length=1)
    api_key: str | None = None


class ModelsOut(BaseModel):
    platform: list[str]
    byo: dict[str, str] | None = None
    active: str


def validate_byo_base_url(base_url: str) -> str:
    target = normalize_url(base_url or "").rstrip("/")
    ok, reason = validate_outbound_url(target)
    if not ok:
        raise HTTPException(status_code=400, detail=f"url_blocked:{reason}")
    return target


async def list_agent_models(
    *,
    ollama: OllamaClient,
    byo: Any | None = None,
    platform_default: str,
) -> ModelsOut:
    platform = await ollama.list_models()
    byo_payload = None
    active = platform_default
    if byo is not None and getattr(byo, "is_byo", False):
        byo_payload = {
            "model": str(getattr(byo, "model", "") or ""),
            "base_url": str(getattr(byo, "base_url", "") or ""),
        }
        if byo_payload["model"]:
            active = byo_payload["model"]
    elif platform:
        active = platform[0]
    return ModelsOut(platform=platform, byo=byo_payload, active=active)


async def test_byo_model(config: BYOModelConfig) -> dict[str, Any]:
    import time

    started = time.perf_counter()
    safe_base_url = validate_byo_base_url(config.base_url)
    client = OllamaClient(base_url=safe_base_url, timeout_sec=30.0)
    try:
        await client.chat(
            model=config.model,
            messages=[{"role": "user", "content": "ping"}],
            temperature=0.1,
            max_tokens=10,
        )
        latency_ms = int((time.perf_counter() - started) * 1000)
        return {"ok": True, "latency_ms": latency_ms, "model": config.model}
    except OllamaClientError as exc:
        return {"ok": False, "error": str(exc)}


async def ollama_health() -> dict[str, Any]:
    """Report Ollama process list and optional host free RAM for /health endpoints.

    Always probes ``resolve_ollama_base_url()`` (AGENT_OLLAMA_BASE_URL) — same target
    as warmup/keepalive (Sprint-5 #59).
    """
    base = resolve_ollama_base_url()
    payload: dict[str, Any] = {
        "ollama_base_url": base,
        "ollama_loaded_models": [],
        "ollama_reachable": False,
        "system_ram_free_mb": None,
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{base.rstrip('/')}/api/ps")
            if response.status_code < 400:
                payload["ollama_reachable"] = True
                data = response.json()
                models = data.get("models") if isinstance(data, dict) else []
                if isinstance(models, list):
                    payload["ollama_loaded_models"] = [
                        {
                            "name": m.get("name"),
                            "size_vram": m.get("size_vram"),
                            "size": m.get("size"),
                        }
                        for m in models
                        if isinstance(m, dict)
                    ]
    except Exception:
        pass
    try:
        import psutil

        payload["system_ram_free_mb"] = int(psutil.virtual_memory().available / (1024 * 1024))
    except ImportError:
        pass
    return payload


class AgentTurnBody(BaseModel):
    """Common POST body for /stream and /sessions/{id}/message across products."""

    prompt: str = Field(min_length=1, max_length=4000)
    mode: AgentMode = AgentMode.agent
    context: dict[str, Any] = Field(default_factory=dict)
    attachments: list[AgentAttachment] = Field(default_factory=list)
    web_search_enabled: bool | None = None
    url_fetch_enabled: bool | None = None
    debug_mode: bool = False


def enrich_context_with_tenant_agent_settings(
    context: dict[str, Any],
    tenant_ai_settings: dict[str, Any] | None,
) -> dict[str, Any]:
    """Merge tenant agent policy into stream request context (no DB access in agent-core)."""
    out = dict(context or {})
    caps = parse_tenant_agent_capabilities(tenant_ai_settings if isinstance(tenant_ai_settings, dict) else None)
    out["tenant_agent_capabilities"] = caps.model_dump()
    if tenant_ai_settings is not None:
        out["tenant_ai_settings"] = tenant_ai_settings
    return out


class AgentCapabilitiesOut(BaseModel):
    web_search_allowed: bool
    web_search_default: bool
    url_fetch_allowed: bool
    pdf_parse_allowed: bool
    image_vision_allowed: bool
    debug_mode_allowed: bool
    platform_web_search: bool
    platform_pdf_parse: bool


def get_agent_capabilities_response(
    tenant_ai_settings: dict[str, Any] | None = None,
) -> AgentCapabilitiesOut:
    caps = parse_tenant_agent_capabilities(tenant_ai_settings)
    public = tenant_capabilities_to_public(caps, flags=load_capability_flags())
    return AgentCapabilitiesOut.model_validate(public)


class AgentCapabilitiesPatchBody(BaseModel):
    """Tenant admin patch for agent_capabilities nested in ai_settings."""

    web_search_allowed: bool | None = None
    web_search_default: bool | None = None
    url_fetch_allowed: bool | None = None
    pdf_parse_allowed: bool | None = None
    image_vision_allowed: bool | None = None
    debug_mode_allowed: bool | None = None


def merge_agent_capabilities_patch(
    tenant_ai_settings: dict[str, Any] | None,
    patch: AgentCapabilitiesPatchBody,
) -> dict[str, Any]:
    """Return updated ai_settings dict with merged agent_capabilities block."""
    out = dict(tenant_ai_settings or {})
    block = dict(out.get("agent_capabilities") or {})
    for field in TenantAgentCapabilities.model_fields:
        val = getattr(patch, field, None)
        if val is not None:
            block[field] = val
    out["agent_capabilities"] = block
    return out


def build_stream_request(
    *,
    session_id: uuid.UUID,
    body: AgentTurnBody | AgentStreamRequest | Any,
) -> AgentStreamRequest:
    """Coerce product stream bodies into AgentStreamRequest with capability fields."""
    if isinstance(body, AgentStreamRequest):
        data = body.model_dump()
        data["session_id"] = session_id
        return AgentStreamRequest.model_validate(data)

    ctx = dict(getattr(body, "context", None) or {})
    ws = getattr(body, "web_search_enabled", None)
    uf = getattr(body, "url_fetch_enabled", None)
    dbg = bool(getattr(body, "debug_mode", False))
    if ws is not None:
        ctx.setdefault("web_search_enabled", ws)
    if uf is not None:
        ctx.setdefault("url_fetch_enabled", uf)
    if dbg:
        ctx.setdefault("debug_mode", dbg)

    return AgentStreamRequest(
        session_id=session_id,
        prompt=body.prompt,
        mode=getattr(body, "mode", AgentMode.agent),
        context=ctx,
        attachments=list(getattr(body, "attachments", None) or []),
        web_search_enabled=ws,
        url_fetch_enabled=uf,
        debug_mode=dbg,
    )
