"""Unit tests for Experience Studio session meta filtering."""

from agent_core.memory_service import session_meta_matches


def test_session_meta_matches_no_filters():
    assert session_meta_matches({"org_slug": "acme", "surface": "experience_studio"}) is True
    assert session_meta_matches(None) is True


def test_session_meta_matches_org_slug():
    nested = {"org_slug": "acme", "surface": "experience_studio"}
    assert session_meta_matches(nested, org_slug="acme") is True
    assert session_meta_matches(nested, org_slug="other") is False
    assert session_meta_matches({}, org_slug="acme") is False


def test_session_meta_matches_surface():
    nested = {"org_slug": "acme", "surface": "experience_studio"}
    assert session_meta_matches(nested, surface="experience_studio") is True
    assert session_meta_matches(nested, surface="template") is False


def test_session_meta_matches_both():
    nested = {"org_slug": "acme", "surface": "experience_studio"}
    assert session_meta_matches(nested, org_slug="acme", surface="experience_studio") is True
    assert session_meta_matches(nested, org_slug="acme", surface="other") is False
