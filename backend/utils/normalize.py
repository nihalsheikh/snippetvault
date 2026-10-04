"""Canonical form for a language id.

`Snippet.language` is a free string — the create endpoint validates length and
nothing else, and the seeded snippets store display-cased values like
`"JavaScript"`. Every filter, lookup and comparison therefore has to agree on one
canonical form, or a filter silently returns nothing: the sidebar links to
`/dashboard?lang=javascript` (lowercased, because that's the id in the frontend's
language table) while the row it should match stores `"JavaScript"`.

The frontend's `normalizeLanguage` is the same function in the same terms —
`trim().toLowerCase()` — so a snippet saved in either casing is findable from
either side.
"""


def normalize_language(value: str | None) -> str | None:
    """Return the id used for comparison, or None if there is nothing to compare.

    None passes through rather than becoming `""` so callers can keep using
    `if language:` to mean "no filter was given" — an empty string is a valid
    thing for a caller to have computed and means filter on it, not filter on
    everything.
    """
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None