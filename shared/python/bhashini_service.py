"""BHASHINI pipeline config cache (keys from env only; batch 09)."""

from __future__ import annotations

import json
import os
from typing import Any

import structlog

log = structlog.get_logger(__name__)

_REDIS_KEY = "bhashini:pipeline_config"


class BhashiniService:
    """Load API keys from environment; cache pipeline config in Redis when available."""

    def __init__(self, redis: Any | None = None) -> None:
        self._redis = redis
        self._api_key = (os.getenv("BHASHINI_API_KEY") or "").strip()
        self._user_id = (os.getenv("BHASHINI_USER_ID") or "").strip()

    @property
    def configured(self) -> bool:
        return bool(self._api_key and self._user_id)

    async def get_pipeline_config(self) -> dict[str, Any]:
        if self._redis is not None:
            try:
                cached = await self._redis.get(_REDIS_KEY)
                if cached:
                    return json.loads(cached)
            except Exception as exc:
                log.warning("bhashini_cache_read_failed", err=str(exc))
        cfg = {
            "user_id": self._user_id,
            "pipeline_tasks": json.loads(os.getenv("BHASHINI_PIPELINE_JSON", "[]") or "[]"),
        }
        if self._redis is not None:
            try:
                await self._redis.setex(_REDIS_KEY, 3600, json.dumps(cfg))
            except Exception as exc:
                log.warning("bhashini_cache_write_failed", err=str(exc))
        return cfg
