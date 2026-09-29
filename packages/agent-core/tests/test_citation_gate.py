"""Sprint-8 citation gate unit tests."""

from agent_core.citation_gate import (
    citation_required_enabled,
    has_citation_markers,
    needs_citation_retry,
    score_org_citation,
)


def test_cited_answer_passes():
    text = "Per policy the seal is required [1]."
    assert has_citation_markers(text)
    score = score_org_citation(text, hit_count=2)
    assert score["passed"] is True
    assert score["cited"] is True


def test_uncited_factual_claim_needs_retry():
    text = "The organization requires a digital signature on every certificate."
    assert needs_citation_retry(text, hit_count=3)
    score = score_org_citation(text, hit_count=3)
    assert score["needs_retry"] is True
    assert score["passed"] is False


def test_no_hits_skips_gate():
    assert needs_citation_retry("Anything is true here.", hit_count=0) is False
    assert citation_required_enabled(product="cert_studio", context={}) is False
    assert citation_required_enabled(
        product="cert_studio", context={"org_knowledge_count": 2}
    )


def test_explicit_env_off(monkeypatch):
    monkeypatch.setenv("AGENT_CITATION_REQUIRED", "false")
    assert (
        citation_required_enabled(
            product="cert_studio", context={"org_knowledge_count": 5}
        )
        is False
    )
