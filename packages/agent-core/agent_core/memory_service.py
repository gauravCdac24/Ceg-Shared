"""Redis short-term session cache + PostgreSQL long-term memory abstraction."""

from __future__ import annotations

import asyncio
import inspect
import json
import os
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

import structlog

from agent_core.memory_retrieval import dedupe_facts, rank_memories
from agent_core.env_resolver import AGENT_MAX_HISTORY_TURNS, resolve_int_env
from agent_core.schemas import AgentProduct, MemoryRecord, MemoryType

try:
    from agent_core.embedding_service import embed_text as _embed_text
except ImportError:
    _embed_text = None  # type: ignore[misc, assignment]

log = structlog.get_logger(__name__)

# When pgvector is unavailable, store embeddings as JSONB {"vector": [...]} and rank in Python.
# Migration pattern: ALTER EXTENSION vector; ALTER TABLE agent_memories ADD COLUMN embedding_vec vector(768);
# then prefer adapter search_facts_semantic using <=> operator.

SESSION_TTL_SEC = 86_400
SESSION_KEY_PREFIX = "agent:session"

def session_meta_matches(
    nested_meta: dict | None,
    *,
    org_slug: str | None = None,
    surface: str | None = None,
) -> bool:
    """Filter agent session nested meta (CreateSessionBody.meta) for product UIs."""
    nested = nested_meta if isinstance(nested_meta, dict) else {}
    if org_slug is not None and str(org_slug) != "" and str(nested.get("org_slug") or "") != str(org_slug):
        return False
    if surface is not None and str(surface) != "" and str(nested.get("surface") or "") != str(surface):
        return False
    return True

SESSION_META_PREFIX = "agent:session_meta"
_LOCAL_ENVS = {"", "local", "dev", "development", "test"}


def _is_non_local_environment() -> bool:
    env = (
        os.getenv("ENVIRONMENT")
        or os.getenv("APP_ENV")
        or os.getenv("CEG_ENV")
        or os.getenv("FETCHDESK_ENV")
        or "development"
    ).strip().lower()
    return env not in _LOCAL_ENVS


class MemoryDbAdapter(ABC):
    """Product layer implements Postgres persistence."""

    @abstractmethod
    async def append_message(
        self,
        *,
        tenant_id: str,
        user_id: str,
        session_id: str,
        product: AgentProduct,
        role: str,
        content: str,
        content_type: str = "text",
        meta: dict[str, Any] | None = None,
    ) -> uuid.UUID:
        ...

    @abstractmethod
    async def list_session_messages(
        self,
        *,
        tenant_id: str,
        session_id: str,
        limit: int = 50,
    ) -> list[dict[str, str]]:
        ...

    @abstractmethod
    async def store_fact(
        self,
        *,
        tenant_id: str,
        user_id: str,
        key: str,
        value: str,
        embedding: list[float] | None = None,
        product: AgentProduct,
        memory_type: str = "episodic",
    ) -> uuid.UUID:
        ...

    @abstractmethod
    async def delete_all_for_tenant(self, *, tenant_id: str) -> int:
        ...

    @abstractmethod
    async def search_facts(
        self,
        *,
        tenant_id: str,
        product: AgentProduct,
        query: str,
        limit: int = 5,
    ) -> list[dict[str, str]]:
        ...

    async def search_facts_raw(
        self,
        *,
        tenant_id: str,
        product: AgentProduct,
        query: str,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Optional richer rows for semantic ranking (override in product adapters)."""
        facts = await self.search_facts(
            tenant_id=tenant_id,
            product=product,
            query=query,
            limit=limit,
        )
        return [{"key": f.get("key", ""), "value": f.get("value", ""), "text_score": 0.5} for f in facts]


class _InMemoryRedis:
    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    async def get(self, key: str) -> str | None:
        return self._store.get(key)

    async def setex(self, key: str, ttl: int, value: str) -> None:
        self._store[key] = value

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def keys(self, pattern: str) -> list[str]:
        prefix = pattern.rstrip("*")
        return [k for k in self._store if k.startswith(prefix)]

    async def scan(
        self,
        cursor: int | str = 0,  # noqa: ARG002
        *,
        match: str | None = None,
        count: int | None = None,  # noqa: ARG002
    ) -> tuple[int, list[str]]:
        keys = await self.keys(match or "*")
        return (0, keys)


class MemoryService:
    def __init__(
        self,
        *,
        redis_client: Any | None = None,
        db_adapter: MemoryDbAdapter | None = None,
        session_ttl_sec: int = SESSION_TTL_SEC,
    ) -> None:
        self._redis = redis_client
        if self._redis is None and _is_non_local_environment():
            raise RuntimeError("Redis is required for MemoryService outside local/dev/test environments")
        self._fallback = _InMemoryRedis()
        self._db = db_adapter
        self._session_ttl_sec = session_ttl_sec

    def _session_key(self, *, product: AgentProduct, tenant_id: str, session_id: str) -> str:
        return f"{SESSION_KEY_PREFIX}:{product.value}:{tenant_id}:{session_id}"

    def _session_meta_key(self, *, product: AgentProduct, tenant_id: str, session_id: str) -> str:
        return f"{SESSION_META_PREFIX}:{product.value}:{tenant_id}:{session_id}"

    async def _redis_op(self, method: str, *args: Any, **kwargs: Any) -> Any:
        """Support both async (redis.asyncio) and sync (redis.Redis) clients."""
        if self._redis is None:
            return await getattr(self._fallback, method)(*args, **kwargs)
        fn = getattr(self._redis, method)
        if inspect.iscoroutinefunction(fn):
            return await fn(*args, **kwargs)
        return await asyncio.to_thread(fn, *args, **kwargs)

    async def _redis_get(self, key: str) -> str | None:
        return await self._redis_op("get", key)

    async def _redis_setex(self, key: str, value: str) -> None:
        await self._redis_op("setex", key, self._session_ttl_sec, value)

    async def _redis_delete(self, key: str) -> None:
        await self._redis_op("delete", key)

    async def _redis_keys(self, pattern: str) -> list[str]:
        keys = await self._redis_op("keys", pattern)
        if not keys:
            return []
        return [k.decode() if isinstance(k, bytes) else str(k) for k in keys]

    async def _redis_scan_keys(self, pattern: str, *, count: int = 200) -> list[str]:
        if self._redis is None:
            return await self._redis_keys(pattern)
        if not hasattr(self._redis, "scan"):
            return await self._redis_keys(pattern)

        cursor: int | str = 0
        out: list[str] = []
        seen: set[str] = set()
        while True:
            cursor, batch = await self._redis_op(
                "scan",
                cursor,
                match=pattern,
                count=count,
            )
            for key in batch or []:
                item = key.decode() if isinstance(key, bytes) else str(key)
                if item not in seen:
                    seen.add(item)
                    out.append(item)
            if str(cursor) == "0":
                break
        return out

    async def get_session_messages(
        self,
        *,
        tenant_id: str,
        session_id: str,
        product: AgentProduct,
        max_turns: int | None = None,
    ) -> list[dict[str, str]]:
        """Return the last N conversation turns (user+assistant pairs) for prompt assembly."""
        turns = max_turns
        if turns is None:
            turns = resolve_int_env(AGENT_MAX_HISTORY_TURNS, profile_default=20)
        message_limit = max(1, int(turns) * 2)
        return await self.get_recent_messages(
            tenant_id=tenant_id,
            session_id=session_id,
            product=product,
            limit=message_limit,
        )

    async def get_recent_messages(
        self,
        *,
        tenant_id: str,
        session_id: str,
        product: AgentProduct,
        limit: int = 20,
    ) -> list[dict[str, str]]:
        key = self._session_key(product=product, tenant_id=tenant_id, session_id=session_id)
        raw = await self._redis_get(key)
        if raw:
            try:
                messages = json.loads(raw)
                if isinstance(messages, list):
                    return messages[-limit:]
            except json.JSONDecodeError:
                log.warning("agent_memory_redis_decode_failed", session_id=session_id)
        if self._db is not None:
            return await self._db.list_session_messages(
                tenant_id=tenant_id,
                session_id=session_id,
                limit=limit,
            )
        return []

    async def append_turn(
        self,
        *,
        tenant_id: str,
        user_id: str,
        session_id: str,
        role: str,
        content: str,
        product: AgentProduct,
        content_type: str = "text",
        meta: dict[str, Any] | None = None,
    ) -> None:
        key = self._session_key(product=product, tenant_id=tenant_id, session_id=session_id)
        messages = await self.get_recent_messages(
            tenant_id=tenant_id,
            session_id=session_id,
            product=product,
            limit=200,
        )
        messages.append(
            {
                "role": role,
                "content": content,
                "ts": datetime.now(timezone.utc).isoformat(),
            }
        )
        await self._redis_setex(key, json.dumps(messages, ensure_ascii=False))
        if self._db is not None:
            await self._db.append_message(
                tenant_id=tenant_id,
                user_id=user_id,
                session_id=session_id,
                product=product,
                role=role,
                content=content,
                content_type=content_type,
                meta=meta,
            )
        if role == "user":
            await self._touch_session_meta(
                product=product,
                tenant_id=tenant_id,
                session_id=session_id,
                user_id=user_id,
                title_seed=content,
            )

    async def _touch_session_meta(
        self,
        *,
        product: AgentProduct,
        tenant_id: str,
        session_id: str,
        user_id: str,
        title_seed: str,
    ) -> None:
        """Update session list fields (title from first user message, updated_at)."""
        existing = await self.get_session_meta(
            product=product,
            tenant_id=tenant_id,
            session_id=session_id,
        )
        if existing is None:
            return
        now = datetime.now(timezone.utc).isoformat()
        existing["updated_at"] = now
        if not existing.get("title") and title_seed.strip():
            text = title_seed.strip().replace("\n", " ")
            existing["title"] = text[:72] + ("…" if len(text) > 72 else "")
        existing.setdefault("user_id", user_id)
        await self.save_session_meta(
            product=product,
            tenant_id=tenant_id,
            session_id=session_id,
            meta=existing,
        )

    async def clear_session(
        self,
        *,
        tenant_id: str,
        session_id: str,
        product: AgentProduct,
    ) -> None:
        key = self._session_key(product=product, tenant_id=tenant_id, session_id=session_id)
        await self._redis_delete(key)
        meta_key = self._session_meta_key(
            product=product, tenant_id=tenant_id, session_id=session_id
        )
        await self._redis_delete(meta_key)

    async def save_session_meta(
        self,
        *,
        product: AgentProduct,
        tenant_id: str,
        session_id: str,
        meta: dict[str, Any],
    ) -> None:
        key = self._session_meta_key(
            product=product, tenant_id=tenant_id, session_id=session_id
        )
        await self._redis_setex(key, json.dumps(meta, ensure_ascii=False))

    async def get_session_meta(
        self,
        *,
        product: AgentProduct,
        tenant_id: str,
        session_id: str,
    ) -> dict[str, Any] | None:
        key = self._session_meta_key(
            product=product, tenant_id=tenant_id, session_id=session_id
        )
        raw = await self._redis_get(key)
        if not raw:
            return None
        try:
            data = json.loads(raw)
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            log.warning("agent_session_meta_decode_failed", session_id=session_id)
            return None

    async def list_sessions(
        self,
        *,
        product: AgentProduct,
        tenant_id: str,
    ) -> list[str]:
        pattern = f"{SESSION_META_PREFIX}:{product.value}:{tenant_id}:*"
        keys = await self._redis_scan_keys(pattern)
        prefix = f"{SESSION_META_PREFIX}:{product.value}:{tenant_id}:"
        return [k[len(prefix) :] for k in keys if k.startswith(prefix)]

    async def list_sessions_for_user(
        self,
        *,
        product: AgentProduct,
        tenant_id: str,
        user_id: str,
        limit: int = 30,
        org_slug: str | None = None,
        surface: str | None = None,
    ) -> list[dict[str, Any]]:
        """Tenant + user scoped session summaries for sidebar."""
        session_ids = await self.list_sessions(product=product, tenant_id=tenant_id)
        rows: list[dict[str, Any]] = []
        for session_id in session_ids:
            meta = await self.get_session_meta(
                product=product,
                tenant_id=tenant_id,
                session_id=session_id,
            )
            if not meta or str(meta.get("user_id") or "") != str(user_id):
                continue
            nested = meta.get("meta") if isinstance(meta.get("meta"), dict) else {}
            if not session_meta_matches(nested, org_slug=org_slug, surface=surface):
                continue
            rows.append(
                {
                    "session_id": session_id,
                    "title": meta.get("title") or "New chat",
                    "updated_at": meta.get("updated_at") or meta.get("created_at"),
                    "created_at": meta.get("created_at"),
                    "org_slug": nested.get("org_slug"),
                    "surface": nested.get("surface"),
                }
            )
        rows.sort(key=lambda r: str(r.get("updated_at") or r.get("created_at") or ""), reverse=True)
        return rows[: max(1, limit)]

    async def delete_tenant_session_metas(
        self,
        *,
        product: AgentProduct,
        tenant_id: str,
    ) -> int:
        pattern = f"{SESSION_META_PREFIX}:{product.value}:{tenant_id}:*"
        keys = await self._redis_scan_keys(pattern)
        for key in keys:
            await self._redis_delete(key)
        return len(keys)

    async def store_fact(
        self,
        *,
        tenant_id: str,
        user_id: str,
        key: str,
        value: str,
        product: AgentProduct,
        embedding: list[float] | None = None,
        memory_type: str = "episodic",
    ) -> uuid.UUID:
        if self._db is None:
            raise RuntimeError("Long-term memory requires a MemoryDbAdapter")
        if embedding is None and _embed_text is not None:
            embedding = await _embed_text(value)
        return await self._db.store_fact(
            tenant_id=tenant_id,
            user_id=user_id,
            key=key,
            value=value,
            embedding=embedding,
            product=product,
            memory_type=memory_type,
        )

    async def delete_all_for_tenant(self, *, tenant_id: str) -> int:
        if self._db is None:
            return 0
        return await self._db.delete_all_for_tenant(tenant_id=tenant_id)

    async def search_facts(
        self,
        *,
        tenant_id: str,
        product: AgentProduct,
        query: str,
        limit: int = 5,
        query_embedding: list[float] | None = None,
        skip_for_chat: bool = False,
    ) -> list[dict[str, str]]:
        if skip_for_chat:
            return []
        if self._db is None or not (query or "").strip():
            return []
        if not tenant_id:
            log.warning("memory_search_missing_tenant")
            return []
        if query_embedding is None and _embed_text is not None:
            query_embedding = await _embed_text(query.strip())
        raw = await self._db.search_facts_raw(
            tenant_id=tenant_id,
            product=product,
            query=query.strip(),
            limit=max(limit * 2, 10),
        )
        ranked = rank_memories(raw, query_embedding=query_embedding)
        facts = dedupe_facts(ranked)[:limit]
        # Sprint-5 #57: retrieval hit rate (non-empty result = hit).
        try:
            from agent_core.metrics import record_retrieval_outcome

            record_retrieval_outcome(product=product.value, hit=bool(facts))
        except Exception:
            pass
        return facts

    async def search_negative_feedback_hints(
        self,
        *,
        tenant_id: str,
        product: AgentProduct,
        intent: str,
        limit: int = 3,
    ) -> list[dict[str, str]]:
        """Recent thumbs-down patterns for this intent (procedural memory)."""
        if self._db is None or not tenant_id:
            return []
        search = getattr(self._db, "search_facts_by_key_prefix", None)
        if search is None:
            return []
        from agent_core.feedback_memory import NEGATIVE_FEEDBACK_KEY_PREFIX, negative_feedback_key

        rows = await search(
            tenant_id=tenant_id,
            product=product,
            key_prefix=negative_feedback_key(intent),
            limit=limit,
        )
        if len(rows) < limit:
            extra = await search(
                tenant_id=tenant_id,
                product=product,
                key_prefix=NEGATIVE_FEEDBACK_KEY_PREFIX,
                limit=limit,
            )
            seen = {r.get("content") for r in rows}
            for row in extra:
                if row.get("content") not in seen:
                    rows.append(row)
                    seen.add(row.get("content"))
                if len(rows) >= limit:
                    break
        return rows[:limit]

    async def store_episode_summary(
        self,
        *,
        tenant_id: str,
        user_id: str,
        session_id: str,
        product: AgentProduct,
        summary: str,
    ) -> uuid.UUID | None:
        """Persist episodic session summary as a long-term fact."""
        if not summary.strip() or self._db is None:
            return None
        key = f"episode:{session_id}:{uuid.uuid4().hex[:8]}"
        return await self.store_fact(
            tenant_id=tenant_id,
            user_id=user_id,
            key=key,
            value=summary.strip()[:2000],
            product=product,
        )

    # ── Sprint 3: typed memory accessors ──────────────────────────────────────

    async def store(
        self,
        content: str,
        tenant_id: str,
        memory_type: MemoryType = MemoryType.EPISODIC,
        user_id: str | None = None,
        metadata: dict | None = None,
        embedding: list[float] | None = None,
        product: AgentProduct = AgentProduct.ceg_portal,
        routing_decision: Any | None = None,
    ) -> str:
        """Store a typed memory record. Returns memory_id."""
        from agent_core.memory_write_policy import MemoryWritePolicy, TurnContext
        from agent_core.query_preprocessor import TaskIntent

        meta = dict(metadata or {})
        intent = TaskIntent.unknown
        if routing_decision is not None:
            intent = getattr(routing_decision, "intent", TaskIntent.unknown)
        elif meta.get("intent"):
            try:
                intent = TaskIntent(str(meta["intent"]))
            except ValueError:
                intent = TaskIntent.unknown
        policy = MemoryWritePolicy()
        if not policy.should_store(
            TurnContext(raw_text=content, routing=routing_decision, intent=intent)
        ):
            log.debug("memory_store_skipped_by_policy", tenant_id=tenant_id)
            return str(uuid.uuid4())
        if self._db is None:
            log.warning("memory_store_no_db_adapter", memory_type=memory_type.value)
            return str(uuid.uuid4())
        turn = TurnContext(raw_text=content, routing=routing_decision, intent=intent)
        if embedding is None and _embed_text is not None and policy.should_embed(turn):
            try:
                embedding = await _embed_text(content)
            except Exception as exc:
                log.warning("memory_store_embed_failed", error=str(exc))
        memory_id = str(uuid.uuid4())
        meta["memory_type"] = memory_type.value
        meta["memory_id"] = memory_id
        await self._db.store_fact(
            tenant_id=tenant_id,
            user_id=user_id or "",
            key=memory_id,
            value=content[:4000],
            embedding=embedding,
            product=product,
            memory_type=memory_type.value,
        )
        log.info("memory_stored", memory_type=memory_type.value, tenant_id=tenant_id, product=product.value)
        return memory_id

    async def retrieve(
        self,
        query: str,
        tenant_id: str,
        memory_type: MemoryType | None = None,
        k: int = 5,
        product: AgentProduct = AgentProduct.ceg_portal,
    ) -> list[MemoryRecord]:
        """Retrieve relevant memories, optionally filtered by type."""
        if self._db is None or not query.strip():
            return []
        query_embedding: list[float] | None = None
        if _embed_text is not None:
            try:
                query_embedding = await _embed_text(query.strip())
            except Exception:
                pass
        raw = await self._db.search_facts_raw(
            tenant_id=tenant_id,
            product=product,
            query=query.strip(),
            limit=max(k * 2, 10),
        )
        records: list[MemoryRecord] = []
        for row in raw:
            row_meta = row.get("meta") or {}
            if isinstance(row_meta, str):
                try:
                    row_meta = json.loads(row_meta)
                except Exception:
                    row_meta = {}
            row_type_str = row_meta.get("memory_type", MemoryType.EPISODIC.value)
            try:
                row_type = MemoryType(row_type_str)
            except ValueError:
                row_type = MemoryType.EPISODIC
            if memory_type is not None and row_type != memory_type:
                continue
            records.append(
                MemoryRecord(
                    memory_id=row_meta.get("memory_id", str(uuid.uuid4())),
                    tenant_id=tenant_id,
                    memory_type=row_type,
                    content=row.get("value", ""),
                    created_at=row.get("created_at") or datetime.now(timezone.utc),
                    metadata=row_meta,
                )
            )
        return records[:k]

    async def store_working(
        self,
        content: str,
        tenant_id: str,
        ttl_seconds: int = 3600,
    ) -> None:
        """Store ephemeral working memory in Redis (not Postgres)."""
        key = f"working_memory:{tenant_id}"
        raw = await self._redis_op("get", key)
        items: list[dict] = json.loads(raw) if raw else []
        items.append({"content": content, "ts": datetime.now(timezone.utc).isoformat()})
        if self._redis is None:
            await self._fallback.setex(key, ttl_seconds, json.dumps(items))
        else:
            fn = getattr(self._redis, "setex")
            if inspect.iscoroutinefunction(fn):
                await fn(key, ttl_seconds, json.dumps(items))
            else:
                await asyncio.to_thread(fn, key, ttl_seconds, json.dumps(items))

    async def retrieve_working(self, tenant_id: str) -> list[dict]:
        """Retrieve current working memory from Redis."""
        key = f"working_memory:{tenant_id}"
        raw = await self._redis_op("get", key)
        if not raw:
            return []
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return []
