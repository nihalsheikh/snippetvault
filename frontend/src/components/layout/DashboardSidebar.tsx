import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Compass, Heart, Globe, LayoutGrid, Lock, TrendingUp } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { LanguageDot } from '@/components/ui/LanguageBadge'
import { currentUser, languageCounts, libraryCounts, plan } from '@/lib/data'
import { cx } from '@/lib/format'

const LIBRARY = [
  { to: '/dashboard', label: 'All Snippets', icon: LayoutGrid, count: libraryCounts.all, end: true },
  { to: '/dashboard?view=favourites', label: 'Favourites', icon: Heart, count: libraryCounts.favourites },
  { to: '/dashboard?view=public', label: 'Public', icon: Globe, count: libraryCounts.public },
  { to: '/dashboard?view=private', label: 'Private', icon: Lock, count: libraryCounts.private },
]

export function DashboardSidebar() {
  const usedPercent = Math.round((plan.used / plan.limit) * 100)

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] flex-col overflow-y-auto border-r border-b1 bg-s1 lg:flex">
      <div className="mb-2 flex items-center gap-2.5 border-b border-b1 p-4">
        <Avatar author={currentUser} size="lg" />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-t1">{currentUser.name}</div>
          <div className="truncate font-mono text-[10px] text-t3">@{currentUser.username}</div>
        </div>
      </div>

      <nav className="py-2">
        <NavLabel>Library</NavLabel>
        {LIBRARY.map((item, i) => (
          <SidebarLink
            key={item.label}
            to={item.to}
            end={i === 0}
            icon={<item.icon size={14} />}
            count={item.count}
          />
        ))}
      </nav>

      <nav className="py-2">
        <NavLabel>Languages</NavLabel>
        {languageCounts.map(({ language, count }) => (
          <SidebarLink
            key={language}
            to={`/dashboard?lang=${language}`}
            icon={<LanguageDot language={language} />}
            count={count}
          />
        ))}
      </nav>

      <nav className="py-2">
        <NavLabel>Community</NavLabel>
        <SidebarLink to="/community" icon={<Compass size={14} />} label="Explore" badge="NEW" />
        <SidebarLink to="/community?sort=trending" icon={<TrendingUp size={14} />} label="Trending" />
      </nav>

      <div className="mt-auto border-t border-b1 p-4">
        <span className="inline-block rounded-[4px] border border-[color-mix(in_srgb,var(--lime)_20%,transparent)] bg-[color-mix(in_srgb,var(--lime)_8%,transparent)] px-2 py-1 font-mono text-[10px] text-lime">
          {plan.name}
        </span>
        <div className="mt-2 text-[11px] text-t3">
          {plan.used}/{plan.limit} snippets used
        </div>
        <div className="mt-1.5 h-[3px] overflow-hidden rounded-[2px] bg-b1">
          <div
            className="h-full rounded-[2px] bg-lime"
            style={{ width: `${usedPercent}%` }}
            role="progressbar"
            aria-valuenow={plan.used}
            aria-valuemin={0}
            aria-valuemax={plan.limit}
          />
        </div>
      </div>
    </aside>
  )
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
  /** Defaults to the trailing path segment, e.g. `/community` → "Community". */
  label?: string
  count?: number
  badge?: string
  end?: boolean
}

function SidebarLink({ to, icon, label, count, badge, end }: SidebarLinkProps) {
  const text = label ?? to.split('/').filter(Boolean).pop() ?? to

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-2.5 border-l-2 border-transparent py-[9px] pl-5 pr-4 text-[13px] transition-colors duration-150',
          isActive
            ? 'border-l-lime bg-[color-mix(in_srgb,var(--lime)_4%,transparent)] text-lime'
            : 'text-t2 hover:bg-b1 hover:text-t1',
        )
      }
    >
      <span className="flex w-[18px] shrink-0 justify-center">{icon}</span>
      <span>{text}</span>
      {badge ? (
        <span className="ml-auto rounded-[3px] bg-[color-mix(in_srgb,var(--lime)_12%,transparent)] px-[5px] py-px text-[9px] font-semibold tracking-[0.5px] text-lime">
          {badge}
        </span>
      ) : count !== undefined ? (
        <span className="ml-auto rounded-[4px] bg-b1 px-[6px] py-0.5 font-mono text-[10px] text-t3">
          {count}
        </span>
      ) : null}
    </NavLink>
  )
}