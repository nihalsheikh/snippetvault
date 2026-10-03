import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'

import { SnippetCard } from '@/components/ui/SnippetCard'
import { FilterChip } from '@/components/ui/Chip'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { LoaderPanel } from '@/components/ui/Loader'
import { useDebounce } from '@/hooks/useDebounce'
import { communityApi, messageOf, snippetsApi } from '@/lib/api'
import { authorMap, toCommunityUser, toSnippets } from '@/lib/mappers'
import { LANGUAGE_OPTIONS, languageMeta } from '@/lib/languages'
import { setViewParam } from '@/lib/nav'
import { formatDate } from '@/lib/format'
import type { Author, Snippet } from '@/lib/types'

type SortKey = 'copies' | 'newest' | 'trending'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'copies', label: 'Most copied' },
  { key: 'newest', label: 'Newest' },
  { key: 'trending', label: 'Trending' },
]

const PAGE_SIZE = 60

export function CommunityPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const search = useDebounce(query, 350)

  const lang = params.get('lang')
  const sort = (params.get('sort') as SortKey | null) ?? 'copies'

  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [trending, setTrending] = useState<Snippet[]>([])
  const [authors, setAuthors] = useState<Map<string, Author>>(new Map())
  const [topAuthors, setTopAuthors] = useState<ReturnType<typeof toCommunityUser>[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function setParam(key: string, value: string | null) {
    setParams(setViewParam(params, key, value), { replace: true })
  }

  // Trending has its own endpoint, so it is fetched once and left alone while the
  // grid refetches — the featured row shouldn't shuffle under every keystroke.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await snippetsApi.trending({ limit: 3 })
        if (cancelled) return
        setTrending(toSnippets(result.items))
      } catch {
        /* the featured row is decorative — a failure just leaves it empty */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const [list, people] = await Promise.all([
          snippetsApi.publicList({
            limit: PAGE_SIZE,
            search,
            language: lang ?? undefined,
          }),
          // One roster call covers every author_id on the page — `SnippetDetails`
          // carries only the id, so the names have to come from somewhere.
          communityApi.users({ limit: 100 }),
        ])
        if (cancelled) return

        const map = authorMap(people.items)
        setSnippets(toSnippets(list.items, map))
        setAuthors(map)
        setTopAuthors(people.items.slice(0, 4).map(toCommunityUser))
        setTotal(list.total)
      } catch (err) {
        if (!cancelled) setError(messageOf(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [search, lang])

  // `copies` and `newest` have no server-side sort, so both are applied to the
  // page that was fetched.
  const results = useMemo(() => {
    const sorted = [...snippets]
    if (sort === 'copies') sorted.sort((a, b) => b.copies - a.copies)
    else if (sort === 'newest') sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    else sorted.sort((a, b) => b.copies - a.copies)
    return sorted
  }, [snippets, sort])

  // The filter chips are built from what's actually on the page rather than a fixed
  // list, so a snippet in a language nobody hardcoded (the create screen accepts any)
  // is still reachable by filter.
  const langs = useMemo(() => {
    const counts = new Map<string, number>()
    for (const snippet of snippets) {
      counts.set(snippet.language, (counts.get(snippet.language) ?? 0) + 1)
    }
    return [...counts.keys()].sort((a, b) => {
      // Curated languages keep their design order ahead of anything typed in.
      const aKnown = LANGUAGE_OPTIONS.some((l) => l.id === a) ? 0 : 1
      const bKnown = LANGUAGE_OPTIONS.some((l) => l.id === b) ? 0 : 1
      if (aKnown !== bKnown) return aKnown - bKnown
      return languageMeta(a).label.localeCompare(languageMeta(b).label)
    })
  }, [snippets])

  return (
    <>
      {/* ---------- header ---------- */}
      <header className="border-b border-b1 bg-s1 px-7 pb-8 pt-10 max-lg:px-5">
        <div className="mx-auto max-w-[1100px]">
          <h1 className="mb-2 font-serif text-[36px] tracking-[-1px]">Community Library</h1>
          <p className="mb-6 text-[15px] text-t2">
            Thousands of battle-tested snippets from developers worldwide. Copy anything in one
            click.
          </p>

          <div className="flex max-w-[600px] gap-2.5">
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-t4"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by language, pattern, keyword... try 'postgres pagination'"
                className="w-full rounded-[var(--radius-r2)] border border-b2 bg-s2 py-3 pl-10 pr-4 text-[14px] text-t1 outline-none transition-colors duration-200 placeholder:text-t4 focus:border-[color-mix(in_srgb,var(--lime)_40%,transparent)]"
              />
            </div>
            {/* The field already searches as you type; this submits the same query. */}
            <Button size="lg" onClick={() => setQuery(query.trim())}>
              Search
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-7 py-7 max-lg:px-5">
        {/* ---------- trending ---------- */}
        {trending.length ? (
          <section className="mb-9">
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[1.5px] text-lime">
              Trending this week
            </div>
            <div className="grid grid-cols-3 gap-3.5 max-lg:grid-cols-2 max-sm:grid-cols-1">
              {trending.map((snippet, i) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  trendingRank={i + 1}
                  showAuthor
                  authors={authors}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* ---------- filters ---------- */}
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-[12px] text-t3">Language:</span>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={!lang} onClick={() => setParam('lang', null)}>
              All
            </FilterChip>
            {langs.map((l) => (
              <FilterChip
                key={l}
                active={lang === l}
                onClick={() => setParam('lang', lang === l ? null : l)}
              >
                {languageMeta(l).label}
              </FilterChip>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[12px] text-t3">
            Sort by:
            <select
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="cursor-pointer rounded-[var(--radius-r1)] border border-b1 bg-s2 px-2 py-1 text-[12px] text-t1 outline-none"
            >
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ---------- results ---------- */}
        <div className="mb-4 flex items-center gap-2 font-mono text-[11px] text-t3">
          <span>
            {total} snippet{total === 1 ? '' : 's'}
          </span>
          {lang ? <span>· {languageMeta(lang).label}</span> : null}
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-r2)] border border-dashed border-b2 py-16 text-center">
            <Search size={24} className="mb-3 text-t4" strokeWidth={1.5} />
            <p className="mb-1 text-[14px] font-medium text-t2">Couldn't load the community</p>
            <p className="mb-5 max-w-[380px] text-[13px] text-t3">{error}</p>
            <button
              type="button"
              onClick={() => setParam('sort', sort)}
              className="text-[13px] font-semibold text-lime"
            >
              Try again →
            </button>
          </div>
        ) : loading ? (
          <div className="rounded-[var(--radius-r2)] border border-dashed border-b2 py-16">
            <LoaderPanel label="Loading snippets" className="" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-r2)] border border-dashed border-b2 py-16 text-center">
            <Search size={24} className="mb-3 text-t4" strokeWidth={1.5} />
            <p className="mb-1 text-[14px] font-medium text-t2">No public snippets found</p>
            <p className="text-[13px] text-t3">Try a different language or a broader search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3.5">
            {results.map((snippet) => (
              <SnippetCard key={snippet.id} snippet={snippet} showAuthor />
            ))}
          </div>
        )}

        {/* ---------- top authors ----------
            The roster has no per-author snippet or copy counts, so each row shows
            the join date instead. The design's "⎘ 6,204" was invented anyway. */}
        {topAuthors.length ? (
          <section className="mt-12 border-t border-b1 pt-8">
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[1.5px] text-lime">
              Newest members
            </div>
            <div className="grid grid-cols-4 gap-3.5 max-sm:grid-cols-2">
              {topAuthors.map((author) => (
                <div
                  key={author.id}
                  className="flex items-center gap-3 rounded-[var(--radius-r2)] border border-b1 bg-s1 p-4 transition-colors hover:border-b2"
                >
                  <Avatar author={author} size="md" />
                  <div className="min-w-0">
                    <Link
                      to={`/user/${author.id}`}
                      className="block truncate text-[13px] font-semibold text-t1 no-underline hover:text-lime"
                    >
                      {author.name}
                    </Link>
                    <div className="truncate font-mono text-[11px] text-t3">
                      joined {formatDate(author.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  )
}