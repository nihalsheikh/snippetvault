import type { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { cx } from '@/lib/format'

const NAV_LINKS = [
  { to: '/#features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
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
          <NavLink
            key={`${link.to}-${i}`}
            to={link.to}
            className="group relative px-4 text-[14px] font-medium text-t2 transition-colors duration-150 hover:text-t1"
          >
            {link.label}
            {link.badge ? (
              <span className="ml-[5px] rounded-[99px] border border-[color-mix(in_srgb,var(--lime)_30%,transparent)] bg-[color-mix(in_srgb,var(--lime)_15%,transparent)] px-1 py-px align-middle text-[9px] font-bold tracking-[0.5px] text-lime">
                {link.badge}
              </span>
            ) : null}
            <span className="absolute inset-x-4 bottom-0 h-[2px] origin-left scale-x-0 rounded-[99px] bg-lime transition-transform duration-200 group-hover:scale-x-100" />
          </NavLink>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <ThemeToggle />

        <Link
          to="/auth?mode=login"
          className="rounded-[var(--radius-r2)] border border-b2 px-[18px] py-2 text-[14px] font-medium text-t1 transition-all hover:border-b3 hover:bg-b1"
        >
          Sign in
        </Link>
        <span className="mx-1 h-5 w-px bg-b2" />
        <Link
          to="/auth?mode=signup"
          className="rounded-[var(--radius-r2)] bg-lime px-5 py-[9px] text-[14px] font-bold tracking-[-0.2px] text-[var(--on-lime)] transition-all hover:-translate-y-px hover:bg-[var(--lime-hover)]"
        >
          Get started free →
        </Link>
      </div>
    </nav>
  )
}

/** Slimmer bar used inside the authenticated app (dashboard, create, detail). */
export function AppTopBar({
  links,
  active,
  right,
}: {
  links: { to: string; label: string }[]
  active: string
  right?: ReactNode
}) {
  return (
    <div className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-b1 bg-s1 px-5">
      <Logo size="sm" />
      <span className="h-5 w-px shrink-0 bg-b2" />
      <div className="flex">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={cx(
              'relative px-[14px] text-[13px] font-medium transition-colors duration-150',
              active === link.label ? 'text-lime' : 'text-t2 hover:text-t1',
            )}
          >
            {link.label}
            {active === link.label ? (
              <span className="absolute inset-x-[14px] bottom-0 h-[2px] rounded-[99px] bg-lime" />
            ) : null}
          </NavLink>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2.5">{right}</div>
    </div>
  )
}