import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Github, Twitter } from 'lucide-react'

import { Logo } from '@/components/ui/Logo'

/**
 * Typed up front: without this, TS widens each column's `links` to a union of
 * object shapes and `link.badge` / `link.status` are not on every member.
 */
interface FooterLink {
  label: string
  to: string
  badge?: string
  status?: boolean
}

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/#features' },
      { label: 'Changelog', to: '/community', badge: 'NEW' },
      { label: 'Roadmap', to: '/docs' },
      { label: 'API', to: '/docs' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Explore Snippets', to: '/community' },
      { label: 'Trending', to: '/community?sort=trending' },
      { label: 'Top Authors', to: '/community' },
      { label: 'Discord', to: '/community' },
      { label: 'GitHub', to: '/community' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', to: '/docs' },
      { label: 'Blog', to: '/docs' },
      { label: 'Guides', to: '/docs' },
      { label: 'Integrations', to: '/docs' },
      { label: 'Status', to: '/docs', status: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/docs' },
      { label: 'Privacy Policy', to: '/docs' },
      { label: 'Terms of Service', to: '/docs' },
      { label: 'Security', to: '/docs' },
      { label: 'Contact', to: '/docs' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-b1 bg-s1 px-10 pt-[60px] max-lg:px-5">
      <div className="mx-auto grid max-w-[1100px] grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-10 pb-12 max-md:grid-cols-2 max-sm:grid-cols-1">
        <div>
          <Logo size="lg" className="mb-4" />
          <p className="mb-6 max-w-[260px] text-[13px] leading-[1.7] text-t2">
            Save, organise, and share your code snippets. AI-powered explanations, Monaco Editor,
            community library.
          </p>
          <div className="flex gap-2">
            <Social href="https://github.com" label="GitHub">
              <Github size={15} />
            </Social>
            <Social href="https://twitter.com" label="Twitter">
              <Twitter size={14} />
            </Social>
            <Social href="https://discord.com" label="Discord">
              <DiscordIcon />
            </Social>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-t1">
              {col.title}
            </div>
            <div className="flex flex-col gap-2.5">
              {col.links.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="flex items-center gap-1.5 text-[13px] text-t2 no-underline transition-colors duration-150 hover:text-t1"
                >
                  {link.label}
                  {link.badge ? <FooterBadge>{link.badge}</FooterBadge> : null}
                  {link.status ? (
                    <span className="flex items-center gap-1 rounded-[3px] border border-[color-mix(in_srgb,var(--green)_25%,transparent)] bg-[color-mix(in_srgb,var(--green)_12%,transparent)] px-[5px] py-px text-[9px] font-semibold tracking-[0.3px] text-green">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green" />
                      UP
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 border-t border-b1 py-5">
        <span className="text-[12px] text-t3">
          © 2025 SnippetVault. Built by <strong className="text-t2">John Doe</strong>.
        </span>
        <div className="flex items-center gap-1.5 text-[12px] text-t3">
          <span className="h-[7px] w-[7px] animate-[pulse2_3s_ease-in-out_infinite] rounded-full bg-green" />
          All systems operational
        </div>
        <div className="flex gap-5">
          {['Privacy', 'Terms', 'Cookies', 'Sitemap'].map((label) => (
            <Link
              key={label}
              to="/docs"
              className="text-[12px] text-t3 no-underline transition-colors duration-150 hover:text-t2"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}

function FooterBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[3px] border border-[color-mix(in_srgb,var(--lime)_25%,transparent)] bg-[color-mix(in_srgb,var(--lime)_12%,transparent)] px-[5px] py-px text-[9px] font-semibold tracking-[0.3px] text-lime">
      {children}
    </span>
  )
}

function Social({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={label}
      aria-label={label}
      className="flex h-[34px] w-[34px] items-center justify-center rounded-[var(--radius-r1)] border border-b2 text-t3 no-underline transition-all duration-200 hover:border-b3 hover:bg-b1 hover:text-t1"
    >
      {children}
    </a>
  )
}

function DiscordIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  )
}