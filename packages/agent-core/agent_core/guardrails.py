"""Input/output safety checks for agent turns."""

from __future__ import annotations

import re
import unicodedata
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel

from agent_core.schemas import AgentMode
from agent_core.pii_output import redact_pii_from_output

if TYPE_CHECKING:
    from agent_core.tool_registry import ToolRegistry

_TOOL_PATTERN = re.compile(
    r"\[TOOL:(?P<name>\w+)\]\s*(?P<args>\{.*?\})\s*\[/TOOL\]",
    re.DOTALL | re.IGNORECASE,
)

# Common Cyrillic / Greek lookalikes → Latin (Sprint-4 #41). Applied after NFKC.
_HOMOGLYPH_MAP = str.maketrans(
    {
        "а": "a",
        "А": "A",
        "е": "e",
        "Е": "E",
        "о": "o",
        "О": "O",
        "р": "p",
        "Р": "P",
        "с": "c",
        "С": "C",
        "у": "y",
        "У": "Y",
        "х": "x",
        "Х": "X",
        "і": "i",
        "І": "I",
        "ї": "i",
        "Ј": "J",
        "ј": "j",
        "ԁ": "d",
        "ɡ": "g",
        "і": "i",
        "Α": "A",
        "Β": "B",
        "Ε": "E",
        "Ζ": "Z",
        "Η": "H",
        "Ι": "I",
        "Κ": "K",
        "Μ": "M",
        "Ν": "N",
        "Ο": "O",
        "Ρ": "P",
        "Τ": "T",
        "Υ": "Y",
        "Χ": "X",
        "α": "a",
        "ο": "o",
        "ν": "v",
        "ρ": "p",
        "τ": "t",
        "υ": "y",
        "χ": "x",
    }
)


def normalize_input(text: str) -> str:
    """NFKC normalize + map common homoglyphs before injection checks (Sprint-4 #41)."""
    cleaned = unicodedata.normalize("NFKC", text or "")
    cleaned = cleaned.translate(_HOMOGLYPH_MAP)
    # Drop zero-width / bidi controls that hide payloads.
    cleaned = "".join(
        ch
        for ch in cleaned
        if unicodedata.category(ch) not in {"Cf", "Cc"} or ch in "\n\r\t"
    )
    return cleaned

_INJECTION_HEURISTIC_PATTERNS = (
    r"<\s*/?\s*(system|assistant|user|human|inst)\s*>",
    r"\[(INST|SYS|SYSTEM)\]",
    r"<\|im_start\|>",
    r"###\s*(system|instruction)\s*:",
    r"(?i)do\s+not\s+follow\s+(the\s+)?(above|prior|previous)",
    r"(?i)override\s+(safety|policy|guardrails?)",
    r"(?i)developer\s+mode\s+enabled",
)

_DEFAULT_BLOCK_PATTERNS = (
    r"ignore\s+(all\s+)?previous",
    r"disregard\s+(all\s+)?instructions",
    r"you\s+are\s+now",
    r"pretend\s+you\s+have\s+no\s+restrictions",
    r"unrestricted\s+model",
    r"print\s+(your\s+)?system\s+prompt",
    r"reveal\s+(your\s+)?(system\s+)?prompt",
    r"system\s*:",
    r"assistant\s*:",
    r"jailbreak",
    r"bypass\s+(the\s+)?proctor",
    r"cheat\s+on\s+(the\s+)?exam",
    r"answers?\s+for\s+(the\s+)?proctored",
)


class GuardrailResult(BaseModel):
    allowed: bool
    reason: str | None = None
    sanitized_prompt: str


_UNSAFE_OUTPUT_PATTERNS = (
    r"-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----",
    r"api[_-]?key\s*[:=]\s*['\"]?\w{20,}",
    r"password\s*[:=]\s*['\"]?\S+",
)

_BLOCKED_OUTPUT_PLACEHOLDER = "[redacted for safety]"

# Strip internal tool/API jargon from user-visible assistant text.
_INTERNAL_JARGON_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\[TOOL:(?P<name>\w+)\][\s\S]*?\[/TOOL\]", re.IGNORECASE), "[action taken]"),
    (re.compile(r"\bcanvas_set_[a-z0-9_]+\b", re.IGNORECASE), "the design tool"),
    (re.compile(r"\bhandle_[a-z0-9_]+_intent\b", re.IGNORECASE), "the design assistant"),
    (re.compile(r"\bgenerate_canvas_code\b", re.IGNORECASE), "the layout generator"),
    (re.compile(r"\bmodify_canvas_code\b", re.IGNORECASE), "the layout editor"),
    (re.compile(r"\bOLLAMA_[A-Z0-9_]+\b"), "the AI service"),
    (re.compile(r"\bAGENT_[A-Z0-9_]+\b"), "the assistant"),
    (re.compile(r"\bJSON\b"), "the configuration"),
    (re.compile(r"\bFabric\.js\b", re.IGNORECASE), "the canvas"),
)


def strip_internal_jargon(text: str) -> str:
    """Remove tool names and internal API jargon from user-facing assistant text."""
    cleaned = (text or "").strip()
    for pattern, replacement in _INTERNAL_JARGON_REPLACEMENTS:
        cleaned = pattern.sub(replacement, cleaned)
    return redact_pii_from_output(cleaned)


class Guardrails:
    def __init__(
        self,
        *,
        topic_patterns: list[str] | None = None,
        block_patterns: list[str] | None = None,
        tool_allowlist: set[str] | None = None,
    ) -> None:
        self._topic_patterns = [re.compile(p, re.IGNORECASE) for p in (topic_patterns or [])]
        blocks = list(_DEFAULT_BLOCK_PATTERNS)
        if block_patterns:
            blocks.extend(block_patterns)
        self._block_patterns = [re.compile(p, re.IGNORECASE) for p in blocks]
        self._heuristic_patterns = [re.compile(p, re.IGNORECASE) for p in _INJECTION_HEURISTIC_PATTERNS]
        self._output_block_patterns = [re.compile(p, re.IGNORECASE) for p in _UNSAFE_OUTPUT_PATTERNS]
        self._tool_allowlist = tool_allowlist

    def check_input(self, text: str) -> GuardrailResult:
        return self.validate_user_input(text)

    def validate_user_input(self, text: str, *, max_len: int = 4000) -> GuardrailResult:
        cleaned = normalize_input(text or "").strip()[:max_len]
        for pattern in self._block_patterns:
            if pattern.search(cleaned):
                return GuardrailResult(
                    allowed=False,
                    reason="blocked_pattern",
                    sanitized_prompt=cleaned,
                )
        heuristic_hits = sum(1 for pattern in self._heuristic_patterns if pattern.search(cleaned))
        if heuristic_hits >= 2:
            return GuardrailResult(
                allowed=False,
                reason="injection_heuristic",
                sanitized_prompt=cleaned,
            )
        if heuristic_hits == 1 and len(cleaned) > 1200:
            return GuardrailResult(
                allowed=False,
                reason="injection_heuristic",
                sanitized_prompt=cleaned,
            )
        if self._topic_patterns:
            if not any(p.search(cleaned) for p in self._topic_patterns):
                return GuardrailResult(
                    allowed=False,
                    reason="off_topic",
                    sanitized_prompt=cleaned,
                )
        return GuardrailResult(allowed=True, sanitized_prompt=cleaned)

    def strip_internal_jargon(self, text: str) -> str:
        return strip_internal_jargon(text)

    def sanitize_user_facing_output(self, text: str, *, max_len: int = 16_384) -> str:
        """Secrets check + jargon strip + light toxicity filter for streamed text."""
        guard = self.validate_agent_output(text, max_len=max_len)
        if not guard.allowed:
            return _BLOCKED_OUTPUT_PLACEHOLDER
        cleaned = self.strip_internal_jargon(guard.sanitized_prompt)
        try:
            from agent_core.moderation import moderate_output

            mod = moderate_output(cleaned)
            if not mod.allowed:
                return mod.sanitized
        except Exception:
            pass
        return cleaned

    def validate_agent_output(self, text: str, *, max_len: int = 16_384) -> GuardrailResult:
        cleaned = (text or "").strip()[:max_len]
        for pattern in self._block_patterns + self._output_block_patterns:
            if pattern.search(cleaned):
                return GuardrailResult(
                    allowed=False,
                    reason="unsafe_output",
                    sanitized_prompt=cleaned,
                )
        return GuardrailResult(allowed=True, sanitized_prompt=cleaned)

    def is_tool_allowed(self, tool_name: str, *, mode: AgentMode) -> bool:
        if mode != AgentMode.agent:
            return False
        if self._tool_allowlist is None:
            return True
        return tool_name in self._tool_allowlist

    def sanitize_actions(self, actions: list[dict]) -> list[dict]:
        safe: list[dict] = []
        for action in actions:
            if not isinstance(action, dict):
                continue
            action_type = str(action.get("type") or action.get("action") or "").upper()
            if action_type.startswith("DELETE_ALL") or action_type.startswith("DROP_"):
                continue
            safe.append(action)
        return safe

    TOOL_RESULT_DELIMITER_START = "--- BEGIN TOOL RESULT (UNTRUSTED) ---"
    TOOL_RESULT_DELIMITER_END = "--- END TOOL RESULT (UNTRUSTED) ---"
    MEMORY_DELIMITER_START = "--- BEGIN MEMORY CONTEXT (UNTRUSTED) ---"
    MEMORY_DELIMITER_END = "--- END MEMORY CONTEXT (UNTRUSTED) ---"

    def sanitize_tool_result(
        self,
        text: str,
        *,
        max_len: int = 4000,
        tool_name: str | None = None,
    ) -> str:
        """Truncate and strip injection-like markers before tool output enters follow-up prompts."""
        from agent_core.tool_calling import strip_pii_from_tool_result

        cleaned = strip_pii_from_tool_result((text or "").strip(), tool_name=tool_name)
        cleaned = normalize_input(cleaned)
        for pattern in self._block_patterns:
            cleaned = pattern.sub("[filtered]", cleaned)
        cleaned = re.sub(r"<\s*system\s*>", "[filtered]", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"<\s*/\s*system\s*>", "[filtered]", cleaned, flags=re.IGNORECASE)
        return cleaned[:max_len]

    def wrap_tool_result(
        self,
        text: str,
        *,
        max_len: int = 4000,
        tool_name: str | None = None,
    ) -> str:
        """Sanitize, truncate, and wrap tool output in untrusted delimiters (AI-P0-01)."""
        cleaned = self.sanitize_tool_result(text, max_len=max_len, tool_name=tool_name)
        escaped = cleaned.replace("--- BEGIN", "[BEGIN]").replace("--- END", "[END]")
        return (
            f"{self.TOOL_RESULT_DELIMITER_START}\n"
            f"{escaped}\n"
            f"{self.TOOL_RESULT_DELIMITER_END}"
        )

    def wrap_memory_context(self, facts: list[Any] | str, *, max_len: int = 4000) -> str:
        """Wrap RAG / memory retrieval blobs as UNTRUSTED (Sprint-4 #43)."""
        if isinstance(facts, list):
            parts: list[str] = []
            for item in facts:
                if isinstance(item, dict):
                    parts.append(str(item.get("value") or item.get("content") or item))
                else:
                    parts.append(str(item))
            raw = "\n".join(parts)
        else:
            raw = str(facts or "")
        cleaned = self.sanitize_tool_result(raw, max_len=max_len, tool_name=None)
        escaped = cleaned.replace("--- BEGIN", "[BEGIN]").replace("--- END", "[END]")
        return (
            f"{self.MEMORY_DELIMITER_START}\n"
            f"{escaped}\n"
            f"{self.MEMORY_DELIMITER_END}"
        )


class OutputGuardResult(BaseModel):
    allowed: bool
    reason: str | None = None
    sanitized_text: str
    truncated: bool = False


class OutputGuardrails:
    def validate(
        self,
        text: str,
        *,
        mode: AgentMode,
        registry: ToolRegistry,
        max_words: int = 1500,
    ) -> OutputGuardResult:
        cleaned = (text or "").strip()
        if mode in (AgentMode.ask, AgentMode.plan):
            if _TOOL_PATTERN.search(cleaned):
                return OutputGuardResult(
                    allowed=False,
                    reason="tool_syntax_in_non_agent_mode",
                    sanitized_text=cleaned,
                )

        for match in _TOOL_PATTERN.finditer(cleaned):
            tool_name = match.group("name")
            if not registry.has_tool(tool_name):
                return OutputGuardResult(
                    allowed=False,
                    reason=f"unregistered_tool:{tool_name}",
                    sanitized_text=cleaned,
                )

        words = cleaned.split()
        truncated = False
        if len(words) > max_words:
            cleaned = " ".join(words[:max_words])
            truncated = True

        return OutputGuardResult(
            allowed=True,
            sanitized_text=strip_internal_jargon(cleaned),
            truncated=truncated,
        )
