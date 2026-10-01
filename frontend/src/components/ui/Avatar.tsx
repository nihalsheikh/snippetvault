import type { Author } from '@/lib/types'
import { avatarGradient, cx } from '@/lib/format'

const SIZES = {
  xs: 'h-[24px] w-[24px] text-[9px]',
  sm: 'h-[28px] w-[28px] text-[10px]',
  md: 'h-[32px] w-[32px] text-[11px]',
  lg: 'h-[34px] w-[34px] text-[12px]',
  xl: 'h-[80px] w-[80px] text-[28px] font-extrabold',
} as const

export function Avatar({
  author,
  size = 'md',
  className,
}: {
  author: Author
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full font-bold text-[var(--on-lime)]',
        SIZES[size],
        className,
      )}
      style={{ background: author.avatarGradient ?? avatarGradient(author.username) }}
      aria-hidden="true"
    >
      {author.initials}
    </span>
  )
}