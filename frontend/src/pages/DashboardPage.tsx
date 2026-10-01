import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUp, LayoutGrid, Plus, Search } from 'lucide-react'

import { SnippetCard } from '@/components/ui/SnippetCard'
import { FilterChip } from '@/components/ui/Chip'
import { ButtonLink } from '@/components/ui/Button'
import { dashboardStats, mySnippets } from '@/lib/data'
import { cx, formatNumber } from '@/lib/format'
import type { Language, Visibility } from '@/lib/types'

type SortKey = 'recent' | 'copies' | 'az'
type ViewKey = 'all' | Visibility

const FILTERS: { label: string; lang?: Language }[] = [
  { label: 'All' },
  { label: 'TypeScript', lang: 'typescript' },
  { label: 'Python', lang: 'python' },
  { label: 'Rust', lang: 'rust' },
  { label: 'Go', lang: 'go' },
  { label: 'SQL', lang: 'sql' },
]

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently added' },
  { key: 'copies', label: 'Most copied' },
  { key: 'az', label: 'A–Z' },
]

export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')

  const lang = (params.get('lang') as Language | null) ?? null
  const view = (params.get('view') as ViewKey | null) ?? 'all'

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()

    let list = mySnippets
    if (view !== 'all') list = list.filter((s) => s.visibility === view)
    if (lang) list = list.filter((s) => s.language === lang)
    if (q) {
      list = list.filter((s) =>
        [s.title, s.description, s.language, ...s.tags].join(' ').toLowerCase().includes(q),
      )
    }

    const sorted = [...list]
    if (sort === 'copies') sorted.sort((a, b) => b.copies - a.copies)
    else if (sort === 'az') sorted.sort((a, b) => a.title.localeCompare(b.title))
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return sorted
  }, [query, view, lang, sort])

  return (
    <>
      <div className="mb-7 flex items-center gap-3">
        <div className="relative max-w-[440px] flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-t4"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search snippets... try 'JWT auth' or 'async retry'"
            className="w-full rounded-[var(--radius-r2)] border border-b1 bg-s2 py-2.5 pl-[38px] pr-4 text-[13px] text-t1 outline-none transition-colors duration-200 placeholder:text-t4 focus:border-[color-mix(in_srgb,var(--lime)_30%,transparent)]"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <ButtonLink to="/snippets/new" variant="ghost" size="sm">
            New Snippet
          </ButtonLink>
          <ButtonLink to="/snippets/new" size="sm">
            + Add
          </ButtonLink>
        </div>
      </div>

      {/* ---- stats ---- */}
      <div className="mb-7 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1">
        <StatCard
          label="TOTAL SNIPPETS"
          value={String(dashboardStats.totalSnippets)}
          valueColor="var(--t1)"
          change={`↑ ${dashboardStats.totalSnippetsDelta} this week`}
        />
        <StatCard
          label="TOTAL COPIES"
          value={formatNumber(dashboardStats.totalCopies)}
          valueColor="var(--lime)"
          change={`↑ ${dashboardStats.totalCopiesDelta} this week`}
        />
        <StatCard
          label="MOST COPIED"
          value={dashboardStats.mostCopied}
          valueColor="var(--cyan)"
          mono
          change={`${dashboardStats.mostCopiedCount} copies all time`}
          neutral
        />
        <StatCard
          label="AI EXPLAINS USED"
          value={String(dashboardStats.aiExplains)}
          valueColor="var(--purple)"
          change="this month"
          neutral
        />
      </div>

      {/* ---- filters ---- */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((filter) => {
          const active = filter.lang ? lang === filter.lang : !lang
          return (
            <FilterChip
              key={filter.label}
              active={active}
              onClick={() => setParam('lang', filter.lang ?? null)}
            >
              {filter.label}
            </FilterChip>
          )
        })}
        <div className="ml-auto flex items-center gap-2 text-[12px] text-t3">
          Sort:
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="cursor-pointer rounded-[var(--radius-r1)] border border-b1 bg-s2 px-2.5 py-1.5 text-[12px] text-t1 outline-none"
          >
            {SORTS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {view !== 'all' ? (
        <div className="mb-4 flex items-center gap-2 text-[12px] text-t3">
          <span>Showing {view} snippets</span>
          <button
            type="button"
            onClick={() => setParam('view', null)}
            className="cursor-pointer text-lime"
          >
            clear
          </button>
        </div>
      ) : null}

      {/* ---- grid ---- */}
      {results.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {results.map((snippet) => (
            <SnippetCard key={snippet.id} snippet={snippet} />
          ))}
          <Link
            to="/snippets/new"
            className="flex min-h-[160px] min-w-[300px] items-center justify-center rounded-[var(--radius-r2)] border border-dashed border-b2 text-t3 transition-colors hover:border-lime hover:text-lime"
          >
            <span className="text-center">
              <Plus size={28} className="mx-auto mb-2" strokeWidth={1.5} />
              <span className="font-mono text-[12px]">New snippet</span>
            </span>
          </Link>
        </div>
      )}
    </>
  )
}

function StatCard({
  label,
  value,
  valueColor,
  change,
  mono = false,
  neutral = false,
}: {
  label: string
  value: string
  valueColor: string
  change: string
  mono?: boolean
  neutral?: boolean
}) {
  return (
    <div className="rounded-[var(--radius-r2)] border border-b1 bg-s1 p-4">
      <div className="mb-1.5 font-mono text-[11px] tracking-[0.5px] text-t3">{label}</div>
      <div
        className={cx(
          'text-[24px] font-bold leading-none',
          mono ? 'mt-1 text-[14px] font-normal' : 'font-serif',
        )}
        style={{ color: valueColor }}
      >
        {value}
      </div>
      <div
        className={cx(
          'mt-1 flex items-center gap-1 font-mono text-[11px]',
          neutral ? 'text-t3' : 'text-green',
        )}
      >
        {!neutral ? <ArrowUp size={11} /> : null}
        {change}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-r2)] border border-dashed border-b2 py-16 text-center">
      <LayoutGrid size={24} className="mb-3 text-t4" strokeWidth={1.5} />
      <p className="mb-1 text-[14px] font-medium text-t2">No snippets match those filters</p>
      <p className="mb-5 text-[13px] text-t3">Try clearing the search or picking another language.</p>
      <Link to="/snippets/new" className="text-[13px] font-semibold text-lime">
        Create a snippet →
      </Link>
    </div>
  )
}