"""Golden NEP/policy citation eval fixtures for CI."""

from __future__ import annotations

import pytest

from agent_core.eval.citation_eval import score_citation_compliance

GOLDEN = [
    {
        "name": "nep_with_sources",
        "response": (
            "NEP 2020 emphasizes experiential learning (Source: https://www.education.gov.in/nep). "
            "Accessed Jan 15, 2026."
        ),
        "used_web_search": True,
        "expect_pass": True,
    },
    {
        "name": "nep_no_url_after_search",
        "response": "NEP 2020 emphasizes experiential learning in schools.",
        "used_web_search": True,
        "expect_pass": False,
    },
    {
        "name": "offline_answer_ok",
        "response": "Foundational literacy is a core NEP goal for grades 3–8.",
        "used_web_search": False,
        "expect_pass": True,
    },
]


@pytest.mark.parametrize("case", GOLDEN, ids=[c["name"] for c in GOLDEN])
def test_golden_citation_compliance(case: dict) -> None:
    result = score_citation_compliance(case["response"], used_web_search=case["used_web_search"])
    assert result["passed"] is case["expect_pass"], result
