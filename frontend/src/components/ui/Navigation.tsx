import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { cx } from '@/lib/format'
import { isSameView } from '@/lib/nav'

const NAV_LINKS = [
  { to: '/#features', label: 'Features' },
  { to: '/community', label: 'Community' },
  { to: '/community', label: 'Changelog', badge: 'NEW' },
  { to: '/docs', label: 'Docs' },
]

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-[100] flex h-[64px] items-center border-b border-b1 bg-[var(--nav-bg)] px-10 backdrop-blur-[20px] max-lg:px-5">
      <Logo />

      <div className="ml-10 hidden items-center md:flex">
        {NAV_LINKS.map((link, i) => (
          <Link
            key={`${link.to}-${i}`}
            to={link.to}
            className="group relative px-4 text-[14px] font-medium text-t2 no-underline transition-colors duration-150 hover:text-t1"
          >
            {link.label}
            {link.badge ? (
              <span className="ml-[5px] rounded-[99px] border border-[color-mix(in_srgb,var(--lime)_30%,transparent)] bg-[color-mix(in_srgb,var(--lime)_15%,transparent)] px-1 py-px align-middle text-[9px] font-bold tracking-[0.5px] text-lime">
                {link.badge}
              </span>
            ) : null}
            <span className="absolute inset-x-4 bottom-0 h-[2px] origin-left scale-x-0 rounded-[99px] bg-lime transition-transform duration-200 group-hover:scale-x-100" />
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <ThemeToggle className="h-[34px] w-[34px]" />

        <Link
          to="/auth?mode=login"
          className="rounded-[var(--radius-r2)] border border-b2 px-[18px] py-2 text-[14px] font-medium text-t1 no-underline transition-all hover:border-b3 hover:bg-b1"
        >
          Sign in
        </Link>

        <Link
          to="/auth?mode=signup"
          className="rounded-[var(--radius-r2)] bg-lime px-5 py-[9px] text-[14px] font-bold tracking-[-0.2px] text-[var(--on-lime)] no-underline transition-all hover:-translate-y-px hover:bg-[var(--lime-hover)]"
        >
          Get started free →
        </Link>
      </div>
    </nav>
  )
}

/**
 * Slimmer bar used inside the app (dashboard, create, community, detail).
 *
 * The current link is derived from the location rather than passed in as a label:
 * `/community` and `/community?sort=trending` are different links to the same path, so
 * a caller-supplied label made them both light up at once.
 *
 * Laid out as a three-column grid rather than a flex row. The search sits in an
 * `auto` column between two `1fr` columns, and equal `1fr` tracks are the only way to
 * actually centre it — with flex, the centre item centres within whatever space the
 * two outer groups happen to leave, so the search drifts left as the nav links grow.
 */
export function AppTopBar({
  links,
  search,
  right,
}: {
  links: { to: string; label: string }[]
  /** Centred in the bar. The caller decides its desktop/mobile variants. */
  search?: ReactNode
  right?: ReactNode
}) {
  const { pathname, search: locationSearch } = useLocation()

  return (
    <div className="sticky top-0 z-50 grid h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-b1 bg-s1 px-5 max-lg:gap-3 max-lg:px-4">
      <div className="flex min-w-0 items-center gap-4 max-lg:gap-3">
        <div className="shrink-0">
          <Logo size="sm" compact />
        </div>
        <span className="h-5 w-px shrink-0 bg-b2 max-sm:hidden" />
        {/* `min-w-0` is what lets this column shrink below its content width at
            all — a grid/flex child defaults to `min-width: auto`, which is the
            intrinsic width of the widest link, so the row refused to narrow and
            pushed "Explore" off the right edge. With it, the links scroll
            horizontally instead: they stay reachable on a phone instead of being
            hidden behind a menu that doesn't exist yet, and `whitespace-nowrap`
            keeps "My Snippets" on one line. */}
        <div className="sv-scroll-x flex min-w-0 flex-1">
          {links.map((link) => {
            // `isSameView` rather than a label comparison: two links can share a
            // pathname and differ only by query string, and both would light up.
            const isCurrent = isSameView(pathname, locationSearch, link.to)
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isCurrent ? 'page' : undefined}
                className={cx(
                  'relative shrink-0 whitespace-nowrap px-[14px] text-[13px] font-medium no-underline transition-colors duration-150',
                  isCurrent ? 'text-lime' : 'text-t2 hover:text-t1',
                )}
              >
                {link.label}
                {isCurrent ? (
                  <span className="absolute inset-x-[14px] bottom-0 h-[2px] rounded-[99px] bg-lime" />
                ) : null}
              </Link>
            )
          })}
        </div>
      </div>

      {/* `justify-self-center` so the search is centred inside its auto track on
          narrow screens too, where the outer columns have collapsed to nothing. */}
      <div className="flex min-w-0 justify-self-center">{search}</div>

      <div className="flex min-w-0 items-center justify-end gap-2.5 max-sm:gap-2">{right}</div>
    </div>
  )
}
