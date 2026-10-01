"""
Gemini wrapper for AI-generated snippet explanations.

Uses google-genai. The older google-generativeai package is deprecated and no
longer receives updates or fixes.

The client is configured per call from GOOGLE_GEMINI_API_KEY / GOOGLE_GEMINI_MODEL,
both of which env_config already refuses to start without.
"""

from google import genai
from google.genai import types

from config.env_config import env_settings

# The snippet is truncated before it reaches the model — a pasted 5,000-line file
# would blow the context window and cost far more than the answer is worth.
MAX_CODE_CHARS = 12_000
MAX_TITLE_CHARS = 200

SYSTEM_PROMPT = """\
You are a senior engineer writing the short, useful explanation that appears \
under a code snippet in SnippetVault.

Rules:
- Plain prose, no preamble like "This code...". Start with what it does.
- Reference identifiers with `backticks` so the UI can style them.
- Be concrete about *why*, not just *what*.
- No headings, no bullet points, no closing summary. 2-4 sentences.
- If the code is incomplete or obfuscated, say so plainly rather than inventing.
"""

EXPLAIN_PROMPT = """\
Explain this {language} snippet.

Title: {title}
{extra}\
Code:
```
{code}
```
"""


class AIServiceError(RuntimeError):
    """Raised when the model call fails. Callers surface this as a 502."""


def _client() -> genai.Client:
    return genai.Client(api_key=env_settings.google_gemini_api_key)


def _truncate(code: str) -> tuple[str, bool]:
    if len(code) <= MAX_CODE_CHARS:
        return code, False

    # Cut on a line boundary so the model never sees half a line.
    cut = code.rfind("\n", 0, MAX_CODE_CHARS)
    if cut == -1:
        cut = MAX_CODE_CHARS
    return code[:cut], True


def explain_snippet(code: str, language: str, title: str | None = None) -> str:
    """Return a plain-prose explanation of `code`. Raises AIServiceError."""
    if not code.strip():
        raise AIServiceError("Cannot explain an empty snippet")

    body, truncated = _truncate(code)

    extra = ""
    if truncated:
        extra = f"(snippet truncated to {MAX_CODE_CHARS} characters)\n"
    if title:
        extra = f"{extra}The author gave it this title: {title[:MAX_TITLE_CHARS]}\n"

    prompt = EXPLAIN_PROMPT.format(
        language=language or "unknown",
        title=(title or "").strip() or "(none given)",
        extra=extra,
        code=body,
    )

    try:
        response = _client().models.generate_content(
            model=env_settings.google_gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
        )
    except Exception as exc:  # noqa: BLE001 - SDK raises a wide range of types
        raise AIServiceError(f"AI explanation failed: {exc}") from exc

    text = (response.text or "").strip()

    if not text:
        raise AIServiceError("The model returned an empty explanation")

    return text


def generate_title(code: str, language: str) -> str:
    """Suggest a short title for an untitled snippet."""
    body, _ = _truncate(code)

    prompt = (
        f"Suggest a short, descriptive title (max 60 characters, no quotes, no "
        f"trailing period) for this {language or 'code'} snippet:\n\n```\n{body}\n```"
    )

    try:
        response = _client().models.generate_content(
            model=env_settings.google_gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You output only the title text. Nothing else."
            ),
        )
    except Exception as exc:  # noqa: BLE001
        raise AIServiceError(f"AI title generation failed: {exc}") from exc

    lines = (response.text or "").strip().strip('"').splitlines()
    return (lines[0][:60] if lines else "").strip()
