"""Content screening for user-authored text.

The rule the product needs: links are the snippet author's privilege, not a
commenter's. A comment carrying a URL, a contact handle, or the usual promo vocabulary
is refused outright, and the refusal names what tripped it so the author can edit
rather than guess.

This runs server-side on write. The frontend mirrors it to disable the Post button,
but that is a courtesy — a caller that skips the UI still gets refused here.
"""

import re
from collections.abc import Iterable

# A bare domain, optionally with a scheme, port, path, query or fragment. Requires a
# real TLD so "e.g" and "Node.js" don't trip it, and matches the protocols people
# actually paste: http(s), bare www, mailto, and the chat-app deep links.
_URL = re.compile(
    r"""(?ix)
    \b
    (?: (?:https?|ftp) :// | www\. )        # scheme or www prefix
    [^\s<>"']+                              # the rest of the authority/path
    |
    \b [\w.+-]+ @ [\w-]+ (?: \. [\w-]+ )+    # bare email address
    |
    \b (?:t\.me|telegram\.me|wa\.me|discord\.gg|discord\.com/invite)
      / [\w-]+
    """
)

# Words that only show up in spam and scam copy. Matched on word boundaries inside a
# lowercased haystack, so "class" can't trip "ass" and "promoted" can't trip "promo"
# twice — the boundaries are what keep the list from firing on ordinary prose.
_PROMO = re.compile(
    r"""(?ix)
    \b (?:
        buy \s (?: now | following )
      | limited \s (?: time \s offer | offer | deal )
      | (?: cheap | free ) \s (?: cash | money | crypto )
      | (?: earn | make | getting ) \s \$? \d+
      | \d+ \s? % \s (?: off | discount )
      | (?: click | visit ) \s (?: here | the )? \s link
      | promo(?:tion)? \s code
      | (?: coupon | discount | referral | affiliate | invite ) \s link
      | casino | forex \s bot | crypto \s bot | betting \s site
      | work \s from \s home \s income | mlm | pyramid
      | (?: free | buy | cheap ) \s followers
      | \d+ \s? % \s (?: profit | gain | roi )
      | (?: dm | message ) \s me \s on
      | (?: join \s )? (?: my | our ) \s (?: channel | group )
    ) \b
    """,
)

# Sexual terms, plus the slurs that get typed at people rather than in code review.
# Kept deliberately blunt: this is a blocklist, and euphemisms defeat euphemisms.
_NSFW = re.compile(
    r"""(?ix)
    \b (?:
        porn | porno | pornography | hentai | camgirl | onlyfans | fansly
      | nsfw | erotic | blowjob | handjob | creampie | cum \s? shot
      | anal | dildo | masturbat \w* | org(?:asm|ies)
      | (?: anal | oral | creampie | cum | fetish | bdsm ) \s (?: sex | play )
      | (?: only | premium | exclusive ) \s (?: nsfw | adult | hentai ) \s (?: content | pics )
      | nudes? | lewd | horny | sexting
      | nig(?:ga|ger) | fagg?(?:ot|ots|s)? | tranny | retard(?:ed|s)?
      | kike | spic | chink | wetback | gook
    ) \b
    """,
)

# The leetspeak people reach for when they know a word is filtered. Applied to a copy
# with the substitutions folded back, so "p0rn" and "n1gga" both land.
_LEET = {"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "9": "g",
         "@": "a", "$": "s"}
_LEET_STRIP = re.compile(rf"[{re.escape(''.join(_LEET))}]")


def _deobfuscate(text: str) -> str:
    """Fold common character substitutions so `p0rn` can't slip past the lists."""
    return _LEET_STRIP.sub(lambda m: _LEET[m.group()], text)


def screen_comment(text: str) -> str | None:
    """Return why `text` is refused, or None when it's acceptable.

    One reason is enough to act on — reporting all three would just be noise in the
    UI. Links are checked first because that is the rule most likely to be the
    actual intent.
    """
    if _URL.search(text):
        return (
            "Comments can't contain links. If a link is relevant, add it to your "
            "snippet's description instead."
        )

    # The word lists read the folded copy, the promo list reads the plain one: folding
    # would turn "50% off" into "5s% off" and the numeric patterns would never match.
    if _NSFW.search(_deobfuscate(text.lower())):
        return "That comment contains language we don't allow here."

    if _PROMO.search(text.lower()):
        return "That comment reads as promotion or spam. Please keep it technical."

    return None


def screen_comment_many(texts: Iterable[str]) -> dict[int, str]:
    """Screen a batch, keyed by position. Used to re-check existing rows."""
    return {i: reason for i, t in enumerate(texts) if (reason := screen_comment(t))}
