# agent-core

Shared Python library for CeG monorepo AI agents.

## Install (editable)

```powershell
pip install -e packages/ai-providers
pip install -e "packages/agent-core[dev]"
```

## Quick start

```python
from agent_core import (
    AgentRunner,
    AgentContext,
    AgentStreamRequest,
    Guardrails,
    MemoryService,
    ModelRouter,
    OllamaClient,
    PromptBuilder,
    ToolRegistry,
    ToolSpec,
)

registry = ToolRegistry()

async def my_tool(**_context) -> str:
    return '{"ok": true}'

registry.register(ToolSpec(name="my_tool", description="demo"), my_tool)

runner = AgentRunner(
    registry=registry,
    llm=OllamaClient(base_url="http://localhost:11435"),
    router=ModelRouter(
        platform_default="llama3.2",
        platform_fast="qwen2.5:3b",
        platform_json="llama3.2",
    ),
    memory=MemoryService(),
    guardrails=Guardrails(),
    prompt_builder=PromptBuilder(),
)

ctx = AgentContext(
    tenant_id="...",
    user_id="...",
    product="quizforge",
    session_id="...",
)

async for event in runner.run_streaming(
    AgentStreamRequest(prompt="Hello"),
    ctx=ctx,
    system_prompt="You are a helpful assistant.",
):
    print(event.to_sse_dict())
```

## Tests

```powershell
pytest packages/agent-core/tests -q
```
