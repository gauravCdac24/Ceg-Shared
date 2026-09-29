"""Jinja template loader for extraction and rubric prompts."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, TemplateNotFound, meta

_PROMPTS_ROOT = Path(__file__).resolve().parent / "prompts"


class TemplateManager:
    def __init__(self, template_dir: Path | None = None) -> None:
        root = template_dir or _PROMPTS_ROOT
        self.env = Environment(
            loader=FileSystemLoader(str(root)),
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def render(self, template_name: str, **kwargs: Any) -> str:
        template = self.env.get_template(template_name)
        return template.render(**kwargs)

    def list_undefined_vars(self, template_name: str, **kwargs: Any) -> list[str]:
        """Return Jinja variables in template that are not provided in kwargs."""
        source, _, _ = self.env.loader.get_source(self.env, template_name)  # type: ignore[union-attr]
        ast = self.env.parse(source)
        required = meta.find_undeclared_variables(ast)
        return sorted(v for v in required if v not in kwargs)
