import { UserRound } from 'lucide-react'
import type { Author } from '@/lib/types'
import { avatarGradient, cx } from '@/lib/format'

const SIZES = {
  xs: 'h-[24px] w-[24px] text-[9px]',
  sm: 'h-[28px] w-[28px] text-[10px]',
  md: 'h-[32px] w-[32px] text-[11px]',
  lg: 'h-[34px] w-[34px] text-[12px]',
  xl: 'h-[80px] w-[80px] text-[28px] font-extrabold',
} as const

/** Glyph size for the no-initials fallback, which can't be expressed in a text class. */
const FALLBACK_ICON = { xs: 12, sm: 14, md: 16, lg: 17, xl: 30 } as const

/**
 * A user's picture, or a generated one.
 *
 * Nothing exposes an upload endpoint, so `profileImage` is normally unset and the
 * generated gradient carries the circle. The gradient is seeded off the account id,
 * so the same person is the same colour on every screen.
 */
export function Avatar({
  author,
  size = 'md',
  className,
}: {
  author: Author
  size?: keyof typeof SIZES
  className?: string
}) {
  // An account with neither a display name nor a handle has nothing to letter, so it
  // gets the person glyph rather than a question mark.
  const hasInitials = Boolean(author.initials) && author.initials !== '?'

  return (
    <span
      className={cx(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-[var(--on-lime)]',
        SIZES[size],
        className,
      )}
      style={{ background: author.avatarGradient ?? avatarGradient(author.username) }}
      aria-hidden="true"
    >
      {author.profileImage ? (
        <img
          src={author.profileImage}
          alt=""
          className="h-full w-full object-cover"
          // A broken upload URL shouldn't leave an empty coloured circle.
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : hasInitials ? (
        author.initials
      ) : (
        <UserRound size={FALLBACK_ICON[size]} />
      )}
    </span>
  )
}
