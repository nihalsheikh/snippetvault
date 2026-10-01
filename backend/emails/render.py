import html as html_lib
import re
from functools import lru_cache
from pathlib import Path

from config.env_config import env_settings

TEMPLATE_DIR = Path(__file__).parent / "templates"
PLACEHOLDER = re.compile(r"\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}")

ICON_BASE = env_settings.base_url.rstrip("/") + "/emails/icons/"


@lru_cache(maxsize=None)
def load_template(template_name: str) -> str:
    return (TEMPLATE_DIR / template_name).read_text(encoding="utf-8")


def render_template(template_name: str, **values: str) -> str:
    # Substitute {{placeholders}}.
    out = load_template(template_name).replace("{{icon_base}}", ICON_BASE)
    missing: set[str] = set()

    def substitute(match: re.Match) -> str:
        key = match.group(1)

        if key not in values:
            missing.add(key)
            return match.group(0)

        return html_lib.escape(str(values[key]), quote=True)

    out = PLACEHOLDER.sub(substitute, out)

    if missing:
        raise ValueError(f"{template_name}: missing placeholders {sorted(missing)}")

    return out
