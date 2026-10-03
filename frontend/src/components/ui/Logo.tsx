import { Link } from 'react-router-dom'
import { cx } from '@/lib/format'

/** The lime "SV" tile + wordmark used in the navbar, appbar and footer. */
export function Logo({
  to = '/',
  size = 'md',
  className,
  compact = false,
}: {
  to?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /**
   * Drop the wordmark on small screens, leaving just the tile. The app top bar needs
   * the room: it carries three nav links plus search, theme, "New snippet" and the
   * avatar, and at 390px the 128px wordmark is the difference between one visible nav
   * link and three. The tile still links home and still reads as SnippetVault once
   * you've seen it once.
   */
  compact?: boolean
}) {
  const tile = {
    sm: 'h-[26px] w-[26px] rounded-[6px] text-[10px]',
    md: 'h-[32px] w-[32px] rounded-[8px] text-[13px]',
    lg: 'h-[36px] w-[36px] rounded-[9px] text-[14px]',
  }[size]

  const word = { sm: 'text-[14px]', md: 'text-[16px]', lg: 'text-[17px]' }[size]

  return (
    <Link to={to} className={cx('flex shrink-0 items-center gap-2.5 no-underline', className)}>
      <span
        className={cx(
          'flex shrink-0 items-center justify-center rounded-[8px] bg-lime font-mono font-bold text-[var(--on-lime)]',
          tile,
        )}
      >
        SV
      </span>
      <span className={cx('font-bold tracking-[-0.4px] text-t1', word, compact && 'hidden sm:inline')}>
        Snippet<span className="text-lime">Vault</span>
      </span>
    </Link>
  )
}