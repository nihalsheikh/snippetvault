"""
Gemini wrapper for AI-generated snippet explanations.

Uses google-genai. The older google-generativeai package is deprecated and no
longer receives updates or fixes.

The client is configured per call from GOOGLE_GEMINI_API_KEY / GOOGLE_GEMINI_MODEL,
both of which env_config already refuses to start without.
"""

import logging
import time

from google import genai
from google.genai import types

from config.env_config import env_settings

logger = logging.getLogger(__name__)

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
    """Raised when the model call fails. Callers surface this as a 502.

    `public_message` is what reaches the client. The provider's own text is kept in
    `str(self)` for the server log, because it names the model and sometimes the
    endpoint — neither of which the frontend should be able to learn.
    """

    def __init__(self, public_message: str, *, detail: str | None = None) -> None:
        super().__init__(detail or public_message)
        self.public_message = public_message


def _client() -> genai.Client:
    return genai.Client(api_key=env_settings.google_gemini_api_key)


# The provider throttles under load and answers 429/503/500 transiently. Those are
# worth another attempt; a bad key or an unknown model is not, so only these codes are
# retried and the attempt budget is deliberately small — the user is waiting on a button.
RETRYABLE_STATUSES = frozenset({429, 500, 502, 503, 504})
MAX_ATTEMPTS = 3
BACKOFF_SECONDS = (0.6, 1.8)


def _status_of(exc: Exception) -> int | None:
    """The HTTP status an SDK exception carries, if it exposes one."""
    # google-genai surfaces API errors as ClientError/ServerError wrapping a response;
    # the code is on `.code`, with the payload on `.response`.
    code = getattr(exc, "code", None)
    if isinstance(code, int):
        return code
    response = getattr(exc, "response", None)
    code = getattr(response, "status_code", None)
    return code if isinstance(code, int) else None


def _generate(prompt: str, system_instruction: str) -> str:
    """Run one prompt to completion, retrying transient provider failures.

    Raises AIServiceError with a client-safe message.
    """
    last: Exception | None = None

    for attempt in range(MAX_ATTEMPTS):
        try:
            # The client is held in a local rather than chained off `_client()`: the
            # SDK closes its transport when the last reference is dropped, and a
            # throwaway returned by `_client()` is collected before the request
            # finishes — which surfaced as "client has been closed" on every call.
            client = _client()
            response = client.models.generate_content(
                model=env_settings.google_gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(system_instruction=system_instruction),
            )
        except Exception as exc:  # noqa: BLE001 - the SDK raises a wide range of types
            last = exc
            status = _status_of(exc)
            retryable = status is None or status in RETRYABLE_STATUSES
            if not retryable or attempt == MAX_ATTEMPTS - 1:
                raise _as_service_error(exc) from exc
            time.sleep(BACKOFF_SECONDS[attempt])
            continue

        text = (response.text or "").strip()
        if not text:
            # Blocked by a safety filter rather than the model failing outright, so
            # retrying would only earn the same empty answer.
            raise AIServiceError(
                "SnippetVault AI had nothing to say about this one. Try a different snippet."
            )
        return text

    # Unreachable: the loop either returns or raises.
    raise _as_service_error(last)  # pragma: no cover


def _as_service_error(exc: Exception | None) -> AIServiceError:
    """Wrap a provider failure, keeping the provider's wording out of the response.

    The SDK's message routinely contains the model id and occasionally the API host,
    both of which would tell anyone reading the network tab which model is behind the
    product. The log keeps the original; the client gets a sentence it can act on.
    """
    raw = str(exc) if exc else "unknown error"
    status = _status_of(exc) if exc else None

    logger.exception("SnippetVault AI provider call failed", exc_info=exc)

    if status in (401, 403):
        public = "SnippetVault AI is not configured correctly on the server."
    elif status == 429:
        public = "SnippetVault AI is busy right now. Try again in a moment."
    elif status in (500, 502, 503, 504):
        public = "SnippetVault AI is temporarily unavailable. Try again in a minute."
    else:
        public = "SnippetVault AI could not complete that request."

    return AIServiceError(public, detail=f"{type(exc).__name__}: {raw}" if exc else raw)


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

    return _generate(prompt, SYSTEM_PROMPT)


def generate_title(code: str, language: str) -> str:
    """Suggest a short title for an untitled snippet."""
    body, _ = _truncate(code)

    prompt = (
        f"Suggest a short, descriptive title (max 60 characters, no quotes, no "
        f"trailing period) for this {language or 'code'} snippet:\n\n```\n{body}\n```"
    )

    text = _generate(prompt, "You output only the title text. Nothing else.")

    lines = text.strip('"').splitlines()
    return (lines[0][:60] if lines else "").strip()
