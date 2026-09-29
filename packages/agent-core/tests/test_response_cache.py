from agent_core.response_cache import (
    cache_key,
    normalize_prompt_for_cache,
    resolve_cache_key,
    semantic_cache_key,
)


def test_cache_key_stable():
    a = cache_key(tenant_id="t1", product="cert_studio", prompt="Hello", model="m")
    b = cache_key(tenant_id="t1", product="cert_studio", prompt="Hello", model="m")
    c = cache_key(tenant_id="t1", product="cert_studio", prompt="Hello!", model="m")
    assert a == b
    assert a != c
    assert a.startswith("agent:resp_cache:cert_studio:")


def test_semantic_key_normalizes_whitespace_and_case():
    a = semantic_cache_key(tenant_id="t1", product="cert_studio", prompt="Hello")
    b = semantic_cache_key(tenant_id="t1", product="cert_studio", prompt="  hello  ")
    c = semantic_cache_key(tenant_id="t1", product="cert_studio", prompt="Hello!")
    assert a == b
    assert a != c
    assert a.startswith("agent:resp_cache:sem:cert_studio:")
    assert normalize_prompt_for_cache("  HeLLo\nWorld  ") == "hello world"


def test_resolve_cache_key_semantic_default(monkeypatch):
    monkeypatch.delenv("AGENT_SEMANTIC_CACHE_ENABLED", raising=False)
    a = resolve_cache_key(tenant_id="t1", product="cert_studio", prompt="Hi")
    b = resolve_cache_key(tenant_id="t1", product="cert_studio", prompt="  hi ")
    assert a == b
    monkeypatch.setenv("AGENT_SEMANTIC_CACHE_ENABLED", "false")
    exact = resolve_cache_key(tenant_id="t1", product="cert_studio", prompt="  hi ")
    assert exact.startswith("agent:resp_cache:cert_studio:")
    assert exact != a
