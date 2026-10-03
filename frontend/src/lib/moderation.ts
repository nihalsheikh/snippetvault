/**
 * A mirror of `backend/utils/moderation.py`, for the comment box.
 *
 * The backend is what enforces this — a comment carrying a link, promo copy or
 * abusive language is refused with a 422 and never reaches the table. This copy
 * exists so the Post button disables the moment the text trips a rule and the
 * author can see why, instead of finding out after trying to post.
 *
 * If the two ever disagree the server wins; keep the patterns in step.
 */

const URL = new RegExp(
  [
    /(?:\b(?:https?|ftp):\/\/|\bwww\.)[^\s<>"']+/i.source,
    /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.source,
    /\b(?:t\.me|telegram\.me|wa\.me|discord\.gg|discord\.com\/invite)\/[\w-]+/.source,
  ].join('|'),
)

const PROMO = new RegExp(
  [
    /\b(?:buy\s(?:now|following))/.source,
    /\blimited\s(?:time\soffer|offer|deal)/.source,
    /\b(?:cheap|free)\s(?:cash|money|crypto)/.source,
    /\b(?:earn|make|getting)\s\$?\d+/.source,
    /\b\d+\s?%\s(?:off|discount)/.source,
    /\b(?:click|visit)\s(?:here|the)?\s?link/.source,
    /\bpromo(?:tion)?\scode/.source,
    /\b(?:coupon|discount|referral|affiliate|invite)\slink/.source,
    /\b(?:casino|forex\sbot|crypto\sbot|betting\ssite)/.source,
    /\bwork\sfrom\shome\sincome/.source,
    /\b(?:mlm|pyramid)\b/.source,
    /\b(?:free|buy|cheap)\sfollowers/.source,
    /\b\d+\s?%\s(?:profit|gain|roi)/.source,
    /\b(?:dm|message)\sme\son/.source,
    /\b(?:join\s)?(?:my|our)\s(?:channel|group)\b/.source,
  ].join('|'),
  'i',
)

const NSFW = new RegExp(
  [
    /\b(?:porn|porno|pornography|hentai|camgirl|onlyfans|fansly)/.source,
    /\b(?:nsfw|erotic|blowjob|handjob|creampie)/.source,
    /\bcum\s?shot\b/.source,
    /\b(?:anal|dildo|masturbat\w*|org(?:asm|ies))\b/.source,
    /\b(?:anal|oral|creampie|cum|fetish|bdsm)\s(?:sex|play)\b/.source,
    /\b(?:only|premium|exclusive)\s(?:nsfw|adult|hentai)\s(?:content|pics)\b/.source,
    /\b(?:nudes?|lewd|horny|sexting)\b/.source,
    /\bnig(?:ga|ger)\b/.source,
    /\bfagg?(?:ot|ots|s)?\b/.source,
    /\b(?:tranny|retard(?:ed|s)?|kike|spic|chink|wetback|gook)\b/.source,
  ].join('|'),
  'i',
)

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '9': 'g',
  '@': 'a', '$': 's',
}

const LEET_STRIP = new RegExp(`[${Object.keys(LEET).join('')}]`, 'g')

/**
 * Why this comment can't be posted, or null when it's fine.
 *
 * Links are checked first — that is the rule most likely to be the actual intent,
 * and it is the one the author needs to hear about specifically.
 */
export function commentRefusal(text: string): string | null {
  if (URL.test(text)) {
    return "Comments can't contain links. If a link is relevant, add it to your snippet's description instead."
  }
  // Folded for the word lists only: folding "50% off" would give "5s% off" and the
  // numeric promo patterns would never match.
  if (NSFW.test(text.toLowerCase().replace(LEET_STRIP, (c) => LEET[c]))) {
    return "That comment contains language we don't allow here."
  }
  if (PROMO.test(text.toLowerCase())) {
    return 'That comment reads as promotion or spam. Please keep it technical.'
  }
  return null
}
