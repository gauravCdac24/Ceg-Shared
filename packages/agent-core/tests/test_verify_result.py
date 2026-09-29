"""Sprint 2 VerifyResult schema tests."""

from agent_core.schemas import VerifyResult


def test_verify_result_confident():
    v = VerifyResult(confident=True, score=0.9, issues=[])
    assert v.score >= 0.6
    assert v.confident
    assert v.issues == []


def test_verify_result_not_confident():
    v = VerifyResult(confident=False, score=0.3, issues=["Empty result"])
    assert not v.confident
    assert len(v.issues) > 0
    assert v.score < 0.6


def test_verify_result_with_multiple_issues():
    v = VerifyResult(confident=False, score=0.2, issues=["No data", "Timeout"])
    assert len(v.issues) == 2


def test_verify_result_threshold():
    passing = VerifyResult(confident=True, score=0.6, issues=[])
    failing = VerifyResult(confident=False, score=0.59, issues=["Below threshold"])
    assert passing.score >= 0.6
    assert failing.score < 0.6
