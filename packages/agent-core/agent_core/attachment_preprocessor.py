"""Pre-process message attachments (images, PDFs) before agent turn."""

from __future__ import annotations

import base64
import re
from typing import Any, Callable

import structlog

from agent_core.capability_flags import load_capability_flags
from agent_core.pdf_job import (
    await_pdf_job,
    enqueue_pdf_extract_job,
    pdf_needs_async_job,
    run_pdf_extract_bytes,
)
from agent_core.schemas import AgentAttachment, AgentStreamRequest
from agent_core.tools.pdf_extract import extract_pdf_text

log = structlog.get_logger(__name__)

_IMAGE_RE = re.compile(r"^image/", re.I)
_PDF_RE = re.compile(r"^application/pdf", re.I)


async def preprocess_attachments(
    request: AgentStreamRequest,
    *,
    ollama_client: Any | None = None,
    ocr_client: Any | None = None,
    redis_client: Any | None = None,
    pdf_celery_dispatch: Callable[[str, str, str, str], None] | None = None,
    tenant_id: str | None = None,
) -> tuple[str, list[str]]:
    """
    Return (augmented_prompt, context_blocks).

    Vision and OCR integrate when clients are provided and flags enabled.
    Large PDFs (>256KB) queue to Celery via redis_client when configured.
    """
    flags = load_capability_flags()
    blocks: list[str] = []
    extra = request.prompt

    for att in request.attachments or []:
        if _IMAGE_RE.match(att.media_type or "") and flags.image_vision and ollama_client:
            desc = await _describe_image(att, ollama_client, user_goal=request.prompt)
            if desc:
                blocks.append(f"[IMAGE DESCRIPTION: {att.filename}]\n{desc}")
        elif _PDF_RE.match(att.media_type or "") and flags.pdf_parse:
            text = await _extract_pdf(
                att,
                ocr_client,
                redis_client=redis_client,
                pdf_celery_dispatch=pdf_celery_dispatch,
                tenant_id=tenant_id,
            )
            if text:
                blocks.append(f"[PDF_CONTENT: {att.filename}]\n{text[:12000]}")

    if blocks:
        extra = f"{request.prompt}\n\n" + "\n\n".join(blocks)
    return extra, blocks


async def _describe_image(att: AgentAttachment, ollama_client: Any, *, user_goal: str) -> str:
    if not att.base64_data:
        return ""
    try:
        result = await ollama_client.generate(
            model="llava",
            prompt=f"Describe this image in detail for use in: {user_goal[:500]}",
            images=[att.base64_data],
        )
        return str(result or "").strip()[:4000]
    except Exception as exc:
        log.warning("agent_image_vision_failed", error=str(exc))
        return ""


async def _extract_pdf(
    att: AgentAttachment,
    ocr_client: Any,
    *,
    redis_client: Any | None = None,
    pdf_celery_dispatch: Callable[[str, str, str, str], None] | None = None,
    tenant_id: str | None = None,
) -> str:
    try:
        if ocr_client is not None:
            if att.url:
                return str(await ocr_client.extract(att.url) or "")
            if att.base64_data:
                raw = base64.b64decode(att.base64_data)
                if hasattr(ocr_client, "extract_bytes"):
                    return str(await ocr_client.extract_bytes(raw) or "")

        if not att.base64_data:
            return ""

        if redis_client is not None and pdf_needs_async_job(att.base64_data):
            job_id = enqueue_pdf_extract_job(
                redis_client=redis_client,
                tenant_id=tenant_id or "unknown",
                filename=att.filename,
                base64_data=att.base64_data,
                celery_dispatch=pdf_celery_dispatch,
            )
            text = await await_pdf_job(redis_client, job_id)
            if text:
                return text
            return ""

        raw = base64.b64decode(att.base64_data)
        return extract_pdf_text(raw) or run_pdf_extract_bytes(raw)
    except Exception as exc:
        log.warning("agent_pdf_parse_failed", error=str(exc))
    return ""
