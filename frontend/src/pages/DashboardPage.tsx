import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LayoutGrid, Plus, Search } from 'lucide-react'

import { SnippetCard } from '@/components/ui/SnippetCard'
import { FilterChip } from '@/components/ui/Chip'
import { ButtonLink } from '@/components/ui/Button'
import { LoaderPanel } from '@/components/ui/Loader'
import { useDebounce } from '@/hooks/useDebounce'
import { messageOf, snippetsApi } from '@/lib/api'
import { toSnippets } from '@/lib/mappers'
import { languageMeta } from '@/lib/languages'
import { setViewParam } from '@/lib/nav'
import { cx, formatNumber } from '@/lib/format'
import type { Snippet, Visibility } from '@/lib/types'

type SortKey = 'recent' | 'copies' | 'az'
type ViewKey = 'all' | 'bookmarks' | Visibility

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently added' },
  { key: 'copies', label: 'Most copied' },
  { key: 'az', label: 'A–Z' },
]

/**
 * The backend pages every list endpoint and caps `limit` at 100, so this covers a
 * whole Free-plan library in one request rather than paginating the dashboard.
 */
const PAGE_SIZE = 100

interface Loaded {
  snippets: Snippet[]
  /** From the list envelope — the true count, not just the page's length. */
  total: number
}

export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')

  // Server-side search is `ILIKE` across title, description and code, so the
  // keystroke is debounced rather than filtered in the browser.
  const search = useDebounce(query, 350)

  const [data, setData] = useState<Loaded | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped by the retry button; not a real dependency of the fetch otherwise.
  const [reload, setReload] = useState(0)

  const lang = params.get('lang')
  const view = (params.get('view') as ViewKey | null) ?? 'all'

  function setParam(key: string, value: string | null) {
    setParams(setViewParam(params, key, value), { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const result =
          view === 'bookmarks'
            ? await snippetsApi.bookmarks({ limit: PAGE_SIZE, search, language: lang ?? undefined })
            : await snippetsApi.mine({ limit: PAGE_SIZE, search, language: lang ?? undefined })
        if (cancelled) return

        const mapped = toSnippets(result.items)
        setData({ snippets: mapped, total: result.total })
      } catch (err) {
        if (!cancelled) {
          setError(messageOf(err))
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [search, lang, view, reload])

  const results = useMemo(() => {
    if (!data) return []
    // Visibility has no server-side filter, and neither does A–Z. Both are applied
    // to the page that was fetched.
    let list =
      view === 'public' || view === 'private'
        ? data.snippets.filter((s) => s.visibility === view)
        : data.snippets

    const sorted = [...list]
    if (sort === 'copies') sorted.sort((a, b) => b.copies - a.copies)
    else if (sort === 'az') sorted.sort((a, b) => a.title.localeCompare(b.title))
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return sorted
  }, [data, sort, view])

  /** The languages actually present in the loaded page, for the filter chips. */
  const langs = useMemo(() => {
    const counts = new Map<string, number>()
    for (const snippet of data?.snippets ?? []) {
      counts.set(snippet.language, (counts.get(snippet.language) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([id]) => id)
  }, [data])

  const stats = useMemo(() => {
    const list = data?.snippets ?? []
    return {
      total: data?.total ?? 0,
      copies: list.reduce((sum, s) => sum + s.copies, 0),
      publicCount: list.filter((s) => s.visibility === 'public').length,
      privateCount: list.filter((s) => s.visibility === 'private').length,
      mostCopied: list.reduce<Snippet | null>(
        (best, s) => (best === null || s.copies > best.copies ? s : best),
        null,
      ),
    }
  }, [data])

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-[440px] flex-1 max-sm:w-full">
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
        <div className="ml-auto flex gap-2 max-sm:w-full">
          <ButtonLink to="/snippets/new" variant="ghost" size="sm">
            New Snippet
          </ButtonLink>
          <ButtonLink to="/snippets/new" size="sm">
            + Add
          </ButtonLink>
        </div>
      </div>

      {/* ---- stats ----
          There is no stats endpoint: totals come from the list envelope's `total`,
          and the copy/AI figures from the fetched page. The design's "↑ N this week"
          deltas had no data source at all — no endpoint records per-week activity —
          so those lines are dropped rather than filled with a fabricated number. */}
      <div className="mb-7 grid grid-cols-3 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1">
        <StatCard
          label="TOTAL SNIPPETS"
          value={formatNumber(stats.total)}
          valueColor="var(--t1)"
          change={
            data
              ? `${stats.publicCount} public · ${stats.privateCount} private`
              : ' '
          }
        />
        <StatCard
          label="TOTAL COPIES"
          value={formatNumber(stats.copies)}
          valueColor="var(--lime)"
          change="across your snippets"
        />
        <StatCard
          label="MOST COPIED"
          value={stats.mostCopied?.title ?? '—'}
          valueColor="var(--cyan)"
          mono
          change={
            stats.mostCopied ? `${formatNumber(stats.mostCopied.copies)} copies all time` : ' '
          }
        />
      </div>

      {/* ---- filters ---- */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <FilterChip active={!lang} onClick={() => setParam('lang', null)}>
          All
        </FilterChip>
        {/* Built from the loaded page, so a snippet saved in a language the old
            hardcoded list omitted (the create screen accepts any) is still filterable. */}
        {langs.map((id) => (
          <FilterChip key={id} active={lang === id} onClick={() => setParam('lang', id)}>
            {languageMeta(id).label}
          </FilterChip>
        ))}
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
      {error ? (
        <MessageState
          title="Couldn't load your snippets"
          body={error}
          action={
            <button
              type="button"
              onClick={() => setReload((n) => n + 1)}
              className="text-[13px] font-semibold text-lime"
            >
              Try again →
            </button>
          }
        />
      ) : loading && !data ? (
        <LoaderPanel label="Loading your library" className="py-16" />
      ) : results.length === 0 ? (
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
}: {
  label: string
  value: string
  valueColor: string
  change: string
  mono?: boolean
}) {
  return (
    <div className="rounded-[var(--radius-r2)] border border-b1 bg-s1 p-4">
      <div className="mb-1.5 font-mono text-[11px] tracking-[0.5px] text-t3">{label}</div>
      <div
        className={cx(
          'truncate text-[24px] font-bold leading-none',
          mono ? 'mt-1 text-[14px] font-normal' : 'font-serif',
        )}
        style={{ color: valueColor }}
        title={value}
      >
        {value}
      </div>
      <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-t3">{change}</div>
    </div>
  )
}

/** Shared loading / error shell. Reuses the empty state's dashed-border treatment. */
function MessageState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-r2)] border border-dashed border-b2 py-16 text-center">
      <LayoutGrid size={24} className="mb-3 text-t4" strokeWidth={1.5} />
      <p className="mb-1 text-[14px] font-medium text-t2">{title}</p>
      <p className="mb-5 max-w-[380px] text-[13px] text-t3">{body}</p>
      {action}
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