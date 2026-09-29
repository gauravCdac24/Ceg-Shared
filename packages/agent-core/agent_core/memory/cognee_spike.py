"""Isolated Cognee memory spike — NOT imported by agent_runner hot path.

PROTOTYPE — NOT WIRED TO PRODUCTION TRAFFIC — do not import from product runtime.
Sprint-8 #24 quarantine. Archive plan: keep under memory/ until F1 gate passes;
otherwise delete in a later cleanup milestone (no product refs today).

Run: python -m agent_core.memory.cognee_spike [--goldens PATH]
Decision gate: proceed to Sprint 6b only if F1 >= pgvector baseline + 0.05.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

from agent_core.memory_write_policy import MemoryWritePolicy, TurnContext
from agent_core.query_preprocessor import TaskIntent


def _load_goldens(path: Path) -> list[dict]:
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def _ollama_config() -> dict[str, str]:
    return {
        "base_url": os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
        "model": os.getenv("OLLAMA_DEFAULT_MODEL", "qwen2.5:7b"),
    }


def _configure_cognee_ollama() -> None:
    """Point Cognee at the same Ollama instance Cert Studio uses (must run before import cognee)."""
    cfg = _ollama_config()
    os.environ["LLM_PROVIDER"] = "ollama"
    os.environ["LLM_MODEL"] = cfg["model"]
    os.environ["LLM_ENDPOINT"] = cfg["base_url"]
    os.environ["LLM_API_KEY"] = os.getenv("LLM_API_KEY", "ollama")
    os.environ["EMBEDDING_PROVIDER"] = "ollama"
    os.environ["EMBEDDING_MODEL"] = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
    os.environ["EMBEDDING_DIMENSIONS"] = os.getenv("EMBEDDING_DIMENSIONS", "768")
    os.environ["HUGGINGFACE_TOKENIZER"] = os.getenv(
        "HUGGINGFACE_TOKENIZER",
        "sentence-transformers/all-MiniLM-L6-v2",
    )


async def _run_cognee_eval(goldens: list[dict]) -> dict[str, float]:
    _configure_cognee_ollama()
    try:
        import cognee  # type: ignore[import-untyped]
    except ImportError:
        return {"precision": 0.0, "recall": 0.0, "f1": 0.0, "error": "cognee_not_installed"}

    policy = MemoryWritePolicy()

    tp = fp = fn = 0
    try:
        for case in goldens:
            tenant_id = str(case.get("tenant_id") or "default")
            for fact in case.get("store") or []:
                turn = TurnContext(
                    raw_text=str(fact.get("value") or ""),
                    intent=TaskIntent.question,
                )
                if not policy.should_store(turn):
                    continue
                await cognee.add(
                    str(fact.get("value") or ""),
                    dataset_name=f"cert_studio_{tenant_id}",
                )
            query = str(case.get("query") or "")
            results = await cognee.search(query, dataset_name=f"cert_studio_{tenant_id}")
            predicted: set[str] = set()
            blob = json.dumps(results).lower()
            for key in case.get("expect_keys") or []:
                if str(key).lower() in blob:
                    predicted.add(str(key))
            expected = set(case.get("expect_keys") or [])
            tp += len(expected & predicted)
            fp += len(predicted - expected)
            fn += len(expected - predicted)

    except Exception as exc:
        return {"precision": 0.0, "recall": 0.0, "f1": 0.0, "error": type(exc).__name__, "detail": str(exc)}

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
    return {"precision": precision, "recall": recall, "f1": f1}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Cognee memory spike eval")
    parser.add_argument(
        "--goldens",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "tests" / "eval" / "memory_goldens.jsonl",
    )
    args = parser.parse_args(argv)
    _configure_cognee_ollama()
    goldens = _load_goldens(args.goldens)

    import importlib.util

    score_path = args.goldens.parent / "score_memory_goldens.py"
    spec = importlib.util.spec_from_file_location("score_memory_goldens", score_path)
    score_mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(score_mod)
    baseline = score_mod.score(args.goldens)
    cognee_metrics = asyncio.run(_run_cognee_eval(goldens))
    gate = baseline["f1"] + 0.05
    report = {
        "pgvector_baseline": baseline,
        "cognee": cognee_metrics,
        "gate_f1_min": gate,
        "proceed_to_6b": cognee_metrics.get("f1", 0.0) >= gate,
    }
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
