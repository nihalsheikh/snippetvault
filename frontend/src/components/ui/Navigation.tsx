import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
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

      {/* No theme switch here. It lives in the app top bar, the dashboard sidebar, and
          Profile → Appearance, so it isn't repeated on every marketing page. */}
      <div className="ml-auto flex items-center gap-2.5">
        <Link
          to="/auth?mode=login"
          className="rounded-[var(--radius-r2)] border border-b2 px-[18px] py-2 text-[14px] font-medium text-t1 no-underline transition-all hover:border-b3 hover:bg-b1"
        >
          Sign in
        </Link>
        <span className="mx-1 h-5 w-px bg-b2" />
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
 */
export function AppTopBar({
  links,
  right,
}: {
  links: { to: string; label: string }[]
  right?: ReactNode
}) {
  const { pathname, search } = useLocation()

  return (
    <div className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-b1 bg-s1 px-5 max-lg:gap-3 max-lg:px-4">
      <div className="shrink-0">
        <Logo size="sm" compact />
      </div>
      <span className="h-5 w-px shrink-0 bg-b2 max-sm:hidden" />
      {/* `min-w-0 flex-1` is what lets this column shrink below its content width at
          all — a flex child defaults to `min-width: auto`, which is the intrinsic
          width of the widest link, so the row refused to narrow and pushed "Explore"
          off the right edge. With it, the links scroll horizontally instead: they stay
          reachable on a phone instead of being hidden behind a menu that doesn't
          exist yet, and `whitespace-nowrap` keeps "My Snippets" on one line. */}
      <div className="sv-scroll-x flex min-w-0 flex-1">
        {links.map((link) => {
          // `isSameView` rather than a label comparison: two links can share a
          // pathname and differ only by query string, and both would light up.
          const isCurrent = isSameView(pathname, search, link.to)
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
      <div className="flex shrink-0 items-center gap-2.5 max-sm:gap-2">{right}</div>
    </div>
  )
}
