"""Per-turn timing for agent stream observability (TTFT / prefill phases).

Logs never include prompt bodies or PII — only durations and coarse labels.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class TurnTiming:
    """Stopwatch buckets for one `/v1/agent/stream` turn."""

    t0: float = field(default_factory=time.perf_counter)
    t_preflight_ms: float | None = None
    t_route_ms: float | None = None
    t_memory_ms: float | None = None
    t_first_token_ms: float | None = None
    path: str | None = None
    intent: str | None = None
    model: str | None = None
    num_predict: int | None = None
    prompt_est_tokens: int | None = None
    reason: str | None = None
    prompt_id: str | None = None
    prompt_version: str | None = None

    def mark_preflight(self) -> None:
        self.t_preflight_ms = round((time.perf_counter() - self.t0) * 1000, 1)

    def mark_route(self) -> None:
        self.t_route_ms = round((time.perf_counter() - self.t0) * 1000, 1)

    def mark_memory(self, started_at: float) -> None:
        self.t_memory_ms = round((time.perf_counter() - started_at) * 1000, 1)

    def mark_first_token(self) -> None:
        if self.t_first_token_ms is None:
            self.t_first_token_ms = round((time.perf_counter() - self.t0) * 1000, 1)

    def total_ms(self) -> float:
        return round((time.perf_counter() - self.t0) * 1000, 1)

    def as_log_fields(self) -> dict[str, Any]:
        return {
            "t_preflight_ms": self.t_preflight_ms,
            "t_route_ms": self.t_route_ms,
            "t_memory_ms": self.t_memory_ms,
            "t_first_token_ms": self.t_first_token_ms,
            "t_total_ms": self.total_ms(),
            "path": self.path,
            "intent": self.intent,
            "model": self.model,
            "num_predict": self.num_predict,
            "prompt_est_tokens": self.prompt_est_tokens,
            "reason": self.reason,
            "prompt_id": self.prompt_id,
            "prompt_version": self.prompt_version,
        }

    def emit_metrics(self, *, product: str = "", error: bool = False) -> None:
        """Fire-and-forget Prometheus / callback metrics (never raises)."""
        try:
            from agent_core.async_callbacks import emit_llm_event

            emit_llm_event(
                phase="error" if error else "end",
                product=product,
                model=self.model or "",
                latency_ms=self.total_ms(),
                ttft_ms=self.t_first_token_ms,
                prompt_tokens=self.prompt_est_tokens,
                prompt_id=self.prompt_id,
                prompt_version=self.prompt_version,
            )
        except Exception:
            pass
