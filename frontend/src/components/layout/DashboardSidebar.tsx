import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bookmark, Compass, FolderOpen, Globe, LayoutGrid, Lock, TrendingUp } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { LanguageDot } from '@/components/ui/LanguageBadge'
import { useAuth } from '@/hooks/useAuth'
import { snippetsApi } from '@/lib/api'
import { toSnippets } from '@/lib/mappers'
import { languageMeta } from '@/lib/languages'
import { isSameView } from '@/lib/nav'
import { avatarGradient, cx, initialsOf } from '@/lib/format'
import type { Author, Language } from '@/lib/types'

/**
 * `/api/snippets` returns a page, so the per-language counts here only cover what was
 * fetched, not the whole library.
 */
const LANGUAGE_SCAN_LIMIT = 100

interface Counts {
  all: number
  bookmarks: number
  public: number
  private: number
}

export function DashboardSidebar() {
  const { profile } = useAuth()
  const { pathname, search } = useLocation()

  const [counts, setCounts] = useState<Counts>({
    all: 0,
    bookmarks: 0,
    public: 0,
    private: 0,
  })
  const [languages, setLanguages] = useState<{ language: Language; count: number }[]>([])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const [mine, saved] = await Promise.all([
          snippetsApi.mine({ limit: LANGUAGE_SCAN_LIMIT }),
          // `limit: 1` — only the total is wanted, so this stays cheap.
          snippetsApi.bookmarks({ limit: 1 }),
        ])
        if (cancelled) return
        setCounts({
          all: mine.total,
          bookmarks: saved.total,
          // `mine` with no filter is the whole library, so the public/private
          // split covers all of it and not just this page.
          public: mine.items.filter((s) => s.is_public).length,
          private: mine.items.filter((s) => !s.is_public).length,
        })
        setLanguages(tallyLanguages(toSnippets(mine.items)))
      } catch {
        /* A failed count leaves the zeros in place — the nav still works. */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // The sidebar only renders once the session is hydrated, so `profile` is set here
  // in practice; the placeholder is for the frame between auth and profile arriving.
  const user: Author = profile
    ? {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        initials: initialsOf(profile.name) || initialsOf(profile.username) || '?',
        avatarGradient: avatarGradient(profile.id),
        profileImage: profile.profileImage,
      }
    : { id: '', name: 'Loading…', username: '', initials: '··', avatarGradient: avatarGradient('') }

  // Every `to` here is paired with a `label` on purpose: the previous version derived
  // it from the last path segment, which rendered `dashboard?view=bookmarks` verbatim.
  const library = [
    { to: '/dashboard', label: 'All Snippets', icon: LayoutGrid, count: counts.all },
    { to: '/dashboard?view=bookmarks', label: 'Saved', icon: Bookmark, count: counts.bookmarks },
    { to: '/dashboard?view=public', label: 'Public', icon: Globe, count: counts.public },
    { to: '/dashboard?view=private', label: 'Private', icon: Lock, count: counts.private },
  ]

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] flex-col overflow-y-auto border-r border-b1 bg-s1 lg:flex">
      <div className="mb-2 flex items-center gap-2.5 border-b border-b1 p-4">
        <Avatar author={user} size="lg" />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-t1">{user.name}</div>
          <div className="truncate font-mono text-[10px] text-t3">@{user.username}</div>
        </div>
      </div>

      <nav className="py-2">
        <NavLabel>Library</NavLabel>
        {library.map((item) => (
          <SidebarLink
            key={item.to}
            to={item.to}
            active={isSameView(pathname, search, item.to)}
            icon={<item.icon size={14} />}
            label={item.label}
            count={item.count}
          />
        ))}
        <SidebarLink
          to="/collections"
          active={isSameView(pathname, search, '/collections')}
          icon={<FolderOpen size={14} />}
          label="Collections"
        />
      </nav>

      {languages.length ? (
        <nav className="py-2">
          <NavLabel>Languages</NavLabel>
          {languages.map(({ language, count }) => {
            const to = `/dashboard?lang=${encodeURIComponent(language)}`
            return (
              <SidebarLink
                key={language}
                to={to}
                active={isSameView(pathname, search, to)}
                icon={<LanguageDot language={language} />}
                label={languageMeta(language).label}
                count={count}
              />
            )
          })}
        </nav>
      ) : null}

      <nav className="py-2">
        <NavLabel>Community</NavLabel>
        <SidebarLink
          to="/community"
          active={isSameView(pathname, search, '/community')}
          icon={<Compass size={14} />}
          label="Explore"
          badge="NEW"
        />
        <SidebarLink
          to="/community?sort=trending"
          active={isSameView(pathname, search, '/community?sort=trending')}
          icon={<TrendingUp size={14} />}
          label="Trending"
        />
      </nav>

      {/* Nothing in the footer. There is no billing backend and no plan on the
          account, so a "FREE · 0/100" meter would be a limit the server never
          enforces. The theme switch lives in the top bar, which is present on
          every screen the sidebar appears on — two toggles meant two places to
          look and one to forget. */}
    </aside>
  )
}

/** Counts languages across a page of snippets, most-used first. */
function tallyLanguages(items: { language: Language }[]) {
  const counts = new Map<Language, number>()
  for (const item of items) {
    counts.set(item.language, (counts.get(item.language) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count || a.language.localeCompare(b.language))
}

function NavLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 px-5 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[1.5px] text-t4">
      {children}
    </div>
  )
}

interface SidebarLinkProps {
  to: string
  icon: ReactNode
  /** Required — the trailing path segment used to stand in for it, and printed
   *  query strings like `dashboard?view=bookmarks` into the nav. */
  label: string
  /** Computed by the caller with `isSameView`; `NavLink` can't see a query string. */
  active: boolean
  count?: number
  badge?: string
}

function SidebarLink({ to, icon, label, active, count, badge }: SidebarLinkProps) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex items-center gap-2.5 border-l-2 border-transparent py-[9px] pl-5 pr-4 text-[13px] no-underline transition-colors duration-150',
        active
          ? 'border-l-lime bg-[color-mix(in_srgb,var(--lime)_4%,transparent)] text-lime'
          : 'text-t2 hover:bg-b1 hover:text-t1',
      )}
    >
      <span className="flex w-[18px] shrink-0 justify-center">{icon}</span>
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-[3px] bg-[color-mix(in_srgb,var(--lime)_12%,transparent)] px-[5px] py-px text-[9px] font-semibold tracking-[0.5px] text-lime">
          {badge}
        </span>
      ) : count !== undefined ? (
        <span className="ml-auto rounded-[4px] bg-b1 px-[6px] py-0.5 font-mono text-[10px] text-t3">
          {count}
        </span>
      ) : null}
    </Link>
  )
}
