"""Handle derivation from an email address.

A handle is the only identity the app shows publicly, so it has to survive being
derived from whatever local part a provider hands us: `john.smith+dev@gmail.com`
becomes `john.smith_dev`, not the raw string. Two things have to hold — the handle
matches the bounds `PATCH /auth/profile` enforces, and it is unique across the unique
index.
"""

import re
from sqlalchemy.orm import Session

from models import User

# Matches the min_length/max_length on UserProfileUpdateRequest.username. Keeping the
# two in step matters: a handle generated here must be one the user is allowed to keep.
MIN_LENGTH = 3
MAX_LENGTH = 30

# Anything that isn't a letter, digit, underscore or dot collapses into a single
# separator. That covers the `+tag` Gmail appends, dashes, and unicode. Dots survive:
# they are what makes `john.smith` readable, and a local part made of nothing else is
# handled by the None return below.
_COLLAPSE = re.compile(r"[^a-z0-9_.]+")

# Leading and trailing separators read badly in an @handle.
_TRIM = re.compile(r"^[_.]+|[_.]+$")


def sanitize_username(raw: str) -> str | None:
    """Reduce an arbitrary string to a usable handle, or None if nothing survives.

    Returns None rather than a filler so the caller can decide what to do — the
    signup path appends a number, and the read-time fallback shows a short id.
    """
    base = _COLLAPSE.sub("_", raw.strip().lower())
    base = _TRIM.sub("", base)
    return base[:MAX_LENGTH] or None


def claim_username(email: str, db: Session) -> str | None:
    """Derive a free handle from `email`, suffixed until it's unique.

    The column is uniquely indexed, so two `alex@…` signups have to disagree. Returns
    None only when the address has no usable characters at all; that account gets no
    handle and the frontend falls back to showing a short id.
    """
    base = sanitize_username(email.split("@")[0]) or "user"

    candidate = base
    suffix = 1
    while db.query(User.id).filter(User.username == candidate).first():
        suffix += 1
        tail = str(suffix)
        candidate = f"{base[: MAX_LENGTH - len(tail)]}{tail}"
    return candidate
