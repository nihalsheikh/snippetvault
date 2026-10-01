import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'

import { SnippetCard } from '@/components/ui/SnippetCard'
import { FilterChip } from '@/components/ui/Chip'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { trendingSnippets, publicSnippets } from '@/lib/data'
import { languageMeta } from '@/lib/languages'
import { formatNumber } from '@/lib/format'
import type { Language } from '@/lib/types'

type SortKey = 'copies' | 'newest' | 'trending'

const LANGS: Language[] = ['typescript', 'python', 'go', 'rust', 'sql', 'bash']

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'copies', label: 'Most copied' },
  { key: 'newest', label: 'Newest' },
  { key: 'trending', label: 'Trending' },
]

export function CommunityPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')

  const lang = (params.get('lang') as Language | null) ?? null
  const sort = (params.get('sort') as SortKey | null) ?? 'copies'

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = publicSnippets

    if (lang) list = list.filter((s) => s.language === lang)
    if (q) {
      list = list.filter((s) =>
        [s.title, s.description, s.language, ...s.tags, s.author.username]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    }

    const sorted = [...list]
    if (sort === 'copies') sorted.sort((a, b) => b.copies - a.copies)
    else if (sort === 'newest') sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    else sorted.sort((a, b) => Number(b.isTrending) - Number(a.isTrending) || b.copies - a.copies)

    return sorted
  }, [query, lang, sort])

  const featured = trendingSnippets.slice(0, 3)

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
            <Button size="lg">Search</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-7 py-7 max-lg:px-5">
        {/* ---------- trending ---------- */}
        <section className="mb-9">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[1.5px] text-lime">
            Trending this week
          </div>
          <div className="grid grid-cols-3 gap-3.5 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {featured.map((snippet, i) => (
              <SnippetCard key={snippet.id} snippet={snippet} trendingRank={i + 1} showAuthor />
            ))}
          </div>
        </section>

        {/* ---------- filters ---------- */}
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-[12px] text-t3">Language:</span>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={!lang} onClick={() => setParam('lang', null)}>
              All
            </FilterChip>
            {LANGS.map((l) => (
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
          <span>{results.length} snippets</span>
          {lang ? <span>· {languageMeta(lang).label}</span> : null}
        </div>

        {results.length === 0 ? (
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

        {/* ---------- top authors ---------- */}
        <section className="mt-12 border-t border-b1 pt-8">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[1.5px] text-lime">
            Top authors this month
          </div>
          <div className="grid grid-cols-4 gap-3.5 max-sm:grid-cols-2">
            {[
              { name: 'Priya Kulkarni', handle: 'priya_k', copies: 6204 },
              { name: 'Marcus Bell', handle: 'mbell', copies: 4880 },
              { name: 'Elena Novak', handle: 'enovak', copies: 3917 },
              { name: 'Aarav Rao', handle: 'aarav_r', copies: 2745 },
            ].map((author) => (
              <div
                key={author.handle}
                className="flex items-center gap-3 rounded-[var(--radius-r2)] border border-b1 bg-s1 p-4 transition-colors hover:border-b2"
              >
                <Avatar
                  author={{
                    id: author.handle,
                    name: author.name,
                    username: author.handle,
                    initials: author.name
                      .split(' ')
                      .map((p) => p[0])
                      .join(''),
                  }}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-t1">{author.name}</div>
                  <div className="truncate font-mono text-[11px] text-t3">
                    ⎘ {formatNumber(author.copies)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}