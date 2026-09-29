"""Optional Cognee memory backend (feature-flagged, shadow-only by default).

PROTOTYPE — NOT WIRED TO PRODUCTION TRAFFIC — do not import from product runtime.
Sprint-8 #24: quarantine; USE_COGNEE_MEMORY defaults false; zero product imports.
"""

from __future__ import annotations

import os
from typing import Any

import structlog

from agent_core.memory_write_policy import MemoryWritePolicy, TurnContext
from agent_core.query_preprocessor import TaskIntent
from agent_core.schemas import AgentProduct

log = structlog.get_logger(__name__)

USE_COGNEE_MEMORY = os.getenv("USE_COGNEE_MEMORY", "false").lower() == "true"
COGNEE_SHADOW_LOG = os.getenv("COGNEE_SHADOW_LOG", "true").lower() != "false"


class CogneeMemoryAdapter:
    """Same surface as CertStudioMemoryAdapter for recall/store experiments."""

    def __init__(self, *, tenant_id: str, product: AgentProduct = AgentProduct.cert_studio) -> None:
        self._tenant_id = tenant_id
        self._product = product
        self._policy = MemoryWritePolicy()

    async def store_fact(
        self,
        *,
        tenant_id: str,
        user_id: str,
        key: str,
        value: str,
        product: AgentProduct,
        **_: Any,
    ) -> str:
        turn = TurnContext(raw_text=value, intent=TaskIntent.question)
        if not self._policy.should_store(turn):
            return ""
        if not USE_COGNEE_MEMORY:
            if COGNEE_SHADOW_LOG:
                log.info(
                    "cognee_shadow_store",
                    tenant_id=tenant_id,
                    key=key,
                    product=product.value,
                    enabled=False,
                )
            return ""
        try:
            import cognee  # type: ignore[import-untyped]

            await cognee.add(value, dataset_name=f"{product.value}_{tenant_id}")
        except Exception as exc:
            log.warning("cognee_store_failed", error=str(exc))
        return key

    async def search_facts(
        self,
        *,
        tenant_id: str,
        product: AgentProduct,
        query: str,
        limit: int = 5,
    ) -> list[dict[str, str]]:
        if not USE_COGNEE_MEMORY:
            if COGNEE_SHADOW_LOG:
                log.info(
                    "cognee_shadow_recall",
                    tenant_id=tenant_id,
                    query=query[:80],
                    product=product.value,
                    enabled=False,
                )
            return []
        try:
            import cognee  # type: ignore[import-untyped]

            raw = await cognee.search(query, dataset_name=f"{product.value}_{tenant_id}")
            text = str(raw)
            return [{"key": "cognee", "value": text[:500]}][:limit]
        except Exception as exc:
            log.warning("cognee_recall_failed", error=str(exc))
            return []
