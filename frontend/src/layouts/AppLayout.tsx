import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Search } from 'lucide-react'

import { AppTopBar } from '@/components/ui/Navigation'
import { Avatar } from '@/components/ui/Avatar'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { avatarGradient, cx, initialsOf } from '@/lib/format'
import type { Author } from '@/lib/types'

interface AppLayoutProps {
  links: { to: string; label: string }[]
  /**
   * The sidebar is the signed-in user's own library, so it is shown only to someone
   * who has one. A reading page (snippet detail, member profile) passes `false` to
   * drop the 240px rail even when signed in.
   */
  sidebar?: boolean
  /** Drop the max-width constraint used by the dashboard. */
  wide?: boolean
}

export function AppLayout({ links, sidebar = true, wide = true }: AppLayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { status } = useAuth()

  // Gated on `authed` rather than `!anon` so the rail doesn't flash during the
  // window where the stored token is still being hydrated — that flash would show
  // the previous user's library.
  const showSidebar = sidebar && status === 'authed'

  return (
    <div className="min-h-screen bg-bg">
      <AppTopBar
        links={links}
        search={<SearchButton onSearch={() => setPaletteOpen(true)} />}
        right={<TopBarRight />}
      />

      <div className={cx('grid', showSidebar ? 'grid-cols-[240px_1fr] max-lg:grid-cols-1' : 'grid-cols-1')}>
        {showSidebar ? <DashboardSidebar /> : null}

        <main className={cx('bg-bg', showSidebar ? 'p-7 max-lg:p-4' : wide ? '' : 'p-7')}>
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

/**
 * The search trigger, rendered in the bar's centre column.
 *
 * The wide placeholder ("Search snippets... ⌘K") is desktop chrome: on a phone it
 * can't be typed into, and it costs 160px of a 390px bar to say nothing. The icon
 * below is the same action — the palette it opens is a real search over the user's
 * library, and ⌘K is still bound on a desktop keyboard.
 */
function SearchButton({ onSearch }: { onSearch: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onSearch}
        aria-label="Search snippets"
        className="hidden min-w-40 items-center gap-2 rounded-[var(--radius-r1)] border border-b1 bg-s2 px-3 py-[5px] font-mono text-[11px] text-t3 transition-all hover:border-b2 hover:text-t2 md:flex"
      >
        <Search size={12} />
        <span className="flex-1 text-left">Search snippets...</span>
        <kbd className="rounded-[3px] border border-b2 bg-b1 px-[5px] py-px text-[10px]">⌘K</kbd>
      </button>

      <button
        type="button"
        onClick={onSearch}
        aria-label="Search snippets"
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-r1)] border border-b1 bg-s2 text-t2 transition-colors hover:border-b2 hover:text-t1 md:hidden"
      >
        <Search size={14} />
      </button>
    </>
  )
}

function TopBarRight() {
  const { profile } = useAuth()

  // Community and the public snippet detail are reachable signed out, where there
  // is no profile at all — the avatar then points at the login page instead.
  const user: Author = profile
    ? {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        initials: initialsOf(profile.name) || initialsOf(profile.username) || '?',
        avatarGradient: avatarGradient(profile.id),
        profileImage: profile.profileImage,
      }
    : { id: '', name: 'Sign in', username: '', initials: '', avatarGradient: avatarGradient('') }

  return (
    <>
      {/* No notifications backend, so no bell. A hardcoded unread dot would claim
          activity that can never arrive. See ProfilePage's Notifications tab. */}

      <ThemeToggle />

      <Link to="/snippets/new" className="max-sm:hidden">
        <Button size="sm">+ New snippet</Button>
      </Link>

      <span className="h-5 w-px bg-b2 max-sm:hidden" />

      <Link to={profile ? '/profile' : '/auth'} title={profile ? `@${user.username}` : 'Sign in'}>
        <Avatar author={user} size="md" className="border-2 border-transparent transition-colors hover:border-lime" />
      </Link>
    </>
  )
}