"""Routing eval confusion matrix — precision/recall per intent."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class LabeledUtterance:
    text: str
    expected_intent: str
    expected_path: str | None = None


@dataclass
class IntentMetrics:
    precision: float
    recall: float
    f1: float
    support: int


def confusion_counts(
    pairs: Iterable[tuple[str, str]],
) -> dict[str, dict[str, int]]:
    matrix: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for expected, predicted in pairs:
        matrix[expected][predicted] += 1
    return {k: dict(v) for k, v in matrix.items()}


def per_intent_metrics(
    pairs: Iterable[tuple[str, str]],
    *,
    min_f1: float = 0.9,
) -> tuple[dict[str, IntentMetrics], bool]:
    """Return metrics per expected intent and whether all meet min_f1."""
    by_expected: dict[str, list[str]] = defaultdict(list)
    for expected, predicted in pairs:
        by_expected[expected].append(predicted)

    all_predicted: dict[str, int] = defaultdict(int)
    for _, predicted in pairs:
        all_predicted[predicted] += 1

    metrics: dict[str, IntentMetrics] = {}
    ok = True
    for intent, preds in by_expected.items():
        tp = sum(1 for p in preds if p == intent)
        fn = len(preds) - tp
        fp = all_predicted[intent] - tp
        precision = tp / (tp + fp) if (tp + fp) else 1.0
        recall = tp / (tp + fn) if (tp + fn) else 1.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
        metrics[intent] = IntentMetrics(precision=precision, recall=recall, f1=f1, support=len(preds))
        if f1 < min_f1:
            ok = False
    return metrics, ok
