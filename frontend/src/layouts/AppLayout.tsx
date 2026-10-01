import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'

import { AppTopBar } from '@/components/ui/Navigation'
import { Avatar } from '@/components/ui/Avatar'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { currentUser } from '@/lib/data'
import { cx } from '@/lib/format'

interface AppLayoutProps {
  links: { to: string; label: string }[]
  active: string
  /** Hide the top bar (the create screen draws its own editor tabs). */
  appBar?: boolean
  /** Hide the sidebar (community and detail are full-width). */
  sidebar?: boolean
  /** Drop the max-width constraint used by the dashboard. */
  wide?: boolean
}

export function AppLayout({
  links,
  active,
  appBar = true,
  sidebar = true,
  wide = true,
}: AppLayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      {appBar ? (
        <AppTopBar links={links} active={active} right={<TopBarRight onSearch={() => setPaletteOpen(true)} />} />
      ) : null}

      <div className={cx('grid', sidebar ? 'grid-cols-[240px_1fr] max-lg:grid-cols-1' : 'grid-cols-1')}>
        {sidebar ? <DashboardSidebar /> : null}

        <main className={cx('bg-bg', sidebar ? 'p-7 max-lg:p-4' : wide ? '' : 'p-7')}>
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

function TopBarRight({ onSearch }: { onSearch: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onSearch}
        className="flex min-w-40 items-center gap-2 rounded-[var(--radius-r1)] border border-b1 bg-s2 px-3 py-[5px] font-mono text-[11px] text-t3 transition-all hover:border-b2 hover:text-t2"
      >
        <Search size={12} />
        <span className="flex-1 text-left">Search snippets...</span>
        <kbd className="rounded-[3px] border border-b2 bg-b1 px-[5px] py-px text-[10px]">⌘K</kbd>
      </button>

      <button
        type="button"
        aria-label="Notifications"
        className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[var(--radius-r1)] border border-b1 text-t2 transition-all hover:border-b2 hover:text-t1"
      >
        <Bell size={16} />
        <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full border-2 border-s1 bg-red" />
      </button>

      <ThemeToggle className="h-[34px] w-[34px] justify-center px-0" />

      <Link to="/snippets/new">
        <Button size="sm">+ New snippet</Button>
      </Link>

      <span className="h-5 w-px bg-b2" />

      <Link to="/profile" title={`@${currentUser.username}`}>
        <Avatar author={currentUser} size="md" className="border-2 border-transparent transition-colors hover:border-lime" />
      </Link>
    </>
  )
}