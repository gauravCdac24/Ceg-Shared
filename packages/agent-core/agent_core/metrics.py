"""Optional Prometheus metrics for LLM turns.

No hard dependency on prometheus_client — counters/histograms no-op when absent.
Never labels with raw prompts, emails, or unhashed user ids.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import structlog

if TYPE_CHECKING:
    from agent_core.async_callbacks import LLMCallEvent

log = structlog.get_logger(__name__)

_PROM: dict[str, Any] = {}
_INIT_ATTEMPTED = False


def _init() -> bool:
    global _INIT_ATTEMPTED
    if _PROM:
        return True
    if _INIT_ATTEMPTED:
        return False
    _INIT_ATTEMPTED = True
    try:
        from prometheus_client import Counter, Histogram
    except ImportError:
        log.debug("prometheus_client_not_installed")
        return False

    _PROM["turns"] = Counter(
        "ceg_llm_turns_total",
        "LLM turn outcomes",
        ["product", "model", "phase"],
    )
    _PROM["latency"] = Histogram(
        "ceg_llm_latency_ms",
        "LLM end-to-end latency in milliseconds",
        ["product", "model"],
        buckets=(50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000),
    )
    _PROM["ttft"] = Histogram(
        "ceg_llm_ttft_ms",
        "Time to first token in milliseconds",
        ["product", "model"],
        buckets=(25, 50, 100, 250, 500, 1000, 2500, 5000, 15000),
    )
    _PROM["tokens"] = Counter(
        "ceg_llm_tokens_total",
        "Estimated or reported tokens",
        ["product", "model", "direction"],
    )
    _PROM["retries"] = Counter(
        "ceg_llm_retries_total",
        "LLM retry attempts",
        ["product", "model"],
    )
    _PROM["guardrail_blocks"] = Counter(
        "ceg_llm_guardrail_blocks_total",
        "Input/output guardrail blocks",
        ["product", "reason"],
    )
    from prometheus_client import Gauge

    _PROM["circuit_open"] = Gauge(
        "ceg_llm_circuit_breaker_open",
        "1 when any model circuit breaker is open",
        ["model"],
    )
    _PROM["retrieval_hits"] = Counter(
        "ceg_llm_retrieval_hits_total",
        "Memory retrieval outcomes",
        ["product", "hit"],
    )
    _PROM["cost_usd"] = Counter(
        "ceg_llm_cost_usd_total",
        "Estimated LLM cost in USD (rate card)",
        ["product", "model"],
    )
    return True


def _safe_label(value: str | None, *, max_len: int = 48) -> str:
    cleaned = (value or "unknown").strip() or "unknown"
    return cleaned[:max_len]


def record_llm_event(event: "LLMCallEvent") -> None:
    if not _init():
        return
    product = _safe_label(event.product)
    model = _safe_label(event.model)
    try:
        _PROM["turns"].labels(product=product, model=model, phase=event.phase).inc()
        if event.latency_ms is not None and event.phase in ("end", "error"):
            _PROM["latency"].labels(product=product, model=model).observe(float(event.latency_ms))
        if event.ttft_ms is not None:
            _PROM["ttft"].labels(product=product, model=model).observe(float(event.ttft_ms))
        if event.prompt_tokens:
            _PROM["tokens"].labels(product=product, model=model, direction="prompt").inc(
                event.prompt_tokens
            )
        if event.completion_tokens:
            _PROM["tokens"].labels(product=product, model=model, direction="completion").inc(
                event.completion_tokens
            )
        if event.retries:
            _PROM["retries"].labels(product=product, model=model).inc(event.retries)
        if event.phase in ("end", "error") and (event.prompt_tokens or event.completion_tokens):
            try:
                from agent_core.cost_ledger import record_llm_cost

                entry = record_llm_cost(
                    tenant_id=event.tenant_id,
                    product=event.product,
                    model=event.model,
                    prompt_tokens=event.prompt_tokens,
                    completion_tokens=event.completion_tokens,
                )
                if entry is not None and entry.cost_usd:
                    _PROM["cost_usd"].labels(product=product, model=model).inc(entry.cost_usd)
            except Exception:
                pass
    except Exception as exc:
        log.debug("llm_metrics_record_failed", error=str(exc))


def record_guardrail_block(*, product: str, reason: str) -> None:
    if not _init():
        return
    try:
        _PROM["guardrail_blocks"].labels(
            product=_safe_label(product),
            reason=_safe_label(reason, max_len=32),
        ).inc()
    except Exception:
        pass


def record_circuit_breaker_state(*, model: str, open_: bool) -> None:
    if not _init():
        return
    try:
        _PROM["circuit_open"].labels(model=_safe_label(model)).set(1 if open_ else 0)
    except Exception:
        pass


def record_retrieval_outcome(*, product: str, hit: bool) -> None:
    if not _init():
        return
    try:
        _PROM["retrieval_hits"].labels(
            product=_safe_label(product),
            hit="1" if hit else "0",
        ).inc()
    except Exception:
        pass


def record_turn_timing(
    *,
    product: str,
    model: str | None,
    latency_ms: float | None,
    ttft_ms: float | None,
    prompt_est_tokens: int | None = None,
    error: bool = False,
) -> None:
    """Convenience bridge from TurnTiming.as_log_fields()."""
    from agent_core.async_callbacks import LLMCallEvent

    record_llm_event(
        LLMCallEvent(
            phase="error" if error else "end",
            product=product,
            model=model or "",
            latency_ms=latency_ms,
            ttft_ms=ttft_ms,
            prompt_tokens=prompt_est_tokens,
        )
    )
