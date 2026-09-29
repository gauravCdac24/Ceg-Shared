"""Per-turn tool execution budgets."""

from __future__ import annotations

from dataclasses import dataclass, field

import structlog

log = structlog.get_logger(__name__)


@dataclass
class ToolExecutionBudget:
    max_tools_per_turn: int = 5
    max_mutations_per_turn: int = 2
    max_tokens_per_turn: int = 8000

    tools_used: int = field(default=0, init=False)
    mutations_used: int = field(default=0, init=False)
    tokens_used: int = field(default=0, init=False)

    def record_tool(self, name: str, *, tokens: int = 0) -> bool:
        """Record a tool call. Returns False if budget exceeded."""
        from agent_core.mutation_preview_gate import is_mutation_tool

        self.tools_used += 1
        self.tokens_used += max(0, tokens)
        if is_mutation_tool(name):
            self.mutations_used += 1
        if self.tools_used > self.max_tools_per_turn:
            log.warning("budget_exceeded", kind="max_tools_per_turn", tool=name)
            return False
        if self.mutations_used > self.max_mutations_per_turn:
            log.warning("budget_exceeded", kind="max_mutations_per_turn", tool=name)
            return False
        if self.tokens_used > self.max_tokens_per_turn:
            log.warning("budget_exceeded", kind="max_tokens_per_turn", tool=name)
            return False
        return True

    @property
    def exceeded(self) -> bool:
        return (
            self.tools_used > self.max_tools_per_turn
            or self.mutations_used > self.max_mutations_per_turn
            or self.tokens_used > self.max_tokens_per_turn
        )
