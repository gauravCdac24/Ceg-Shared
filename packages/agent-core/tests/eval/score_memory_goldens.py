#!/usr/bin/env python3
"""Score pgvector-style memory recall against memory_goldens.jsonl (keyword baseline)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _load_cases(path: Path) -> list[dict]:
    cases: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            cases.append(json.loads(line))
    return cases


def _recall(case: dict) -> set[str]:
    query = str(case.get("query") or "").lower()
    hits: set[str] = set()
    for fact in case.get("store") or []:
        key = str(fact.get("key") or "")
        value = str(fact.get("value") or "").lower()
        if key.lower() in query or any(tok in value for tok in query.split() if len(tok) > 3):
            hits.add(key)
        elif any(tok in query for tok in value.split() if len(tok) > 3):
            hits.add(key)
    for fact in case.get("store") or []:
        key = str(fact.get("key") or "")
        value = str(fact.get("value") or "").lower()
        if key.replace("_", " ") in query or query in value:
            hits.add(key)
    return hits


def score(path: Path) -> dict[str, float]:
    cases = _load_cases(path)
    tp = fp = fn = 0
    for case in cases:
        expected = set(case.get("expect_keys") or [])
        predicted = _recall(case)
        tp += len(expected & predicted)
        fp += len(predicted - expected)
        fn += len(expected - predicted)
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
    return {"precision": precision, "recall": recall, "f1": f1, "cases": len(cases)}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Score memory goldens (pgvector keyword baseline)")
    parser.add_argument(
        "--goldens",
        type=Path,
        default=Path(__file__).resolve().parent / "memory_goldens.jsonl",
    )
    args = parser.parse_args(argv)
    metrics = score(args.goldens)
    print(json.dumps(metrics, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
