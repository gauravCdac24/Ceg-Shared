"""Sprint-6 #66: online hallucination judge stub (nightly only).

Full online judge deferred — residual documented in ISSUE_TRACKER #66.
"""

from __future__ import annotations


def score_hallucination_stub(answer: str, *, grounded_facts: list[str] | None = None) -> dict:
    """Placeholder judge: flags empty answers; does not call an LLM."""
    text = (answer or "").strip()
    if not text:
        return {"passed": False, "score": 0.0, "reason": "empty_answer", "online": False}
    # Residual: no NLI / LLM-as-judge yet.
    return {
        "passed": True,
        "score": 1.0 if grounded_facts else 0.5,
        "reason": "stub_accept",
        "online": False,
        "residual": "full online judge deferred to later milestone",
    }


def test_hallucination_stub_empty_fails() -> None:
    assert score_hallucination_stub("")["passed"] is False


def test_hallucination_stub_nonempty_passes() -> None:
    result = score_hallucination_stub("NEP 2020 emphasizes foundational literacy.")
    assert result["passed"] is True
    assert result["online"] is False
