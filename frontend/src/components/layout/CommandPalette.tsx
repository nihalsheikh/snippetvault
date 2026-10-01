import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, Search } from 'lucide-react'

import { LanguageDot } from '@/components/ui/LanguageBadge'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { snippetsApi } from '@/lib/api'
import { toSnippets } from '@/lib/mappers'
import { cx } from '@/lib/format'
import type { Snippet } from '@/lib/types'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Signed-in users search their own library; everyone else searches public snippets. */
const RESULT_LIMIT = 8

/** ⌘K quick search over snippets. */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [results, setResults] = useState<Snippet[]>([])
  const [searching, setSearching] = useState(false)
  const navigate = useNavigate()
  const { status } = useAuth()

  const search = useDebounce(query, 250)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setSearching(true)

    void (async () => {
      try {
        const params = { limit: RESULT_LIMIT, search: search || undefined }
        const result =
          status === 'authed'
            ? await snippetsApi.mine(params)
            : await snippetsApi.publicList(params)
        if (!cancelled) setResults(toSnippets(result.items))
      } catch {
        // A failed search leaves the previous results in place; the panel stays
        // usable rather than emptying to "no matches".
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [search, open, status])

  useEffect(() => setCursor(0), [search])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  // ⌘K / Ctrl-K toggles the palette from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (!open) return null

  function go(id: string) {
    onOpenChange(false)
    navigate(`/snippet/${id}`)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Search snippets"
    >
      <div
        className="animate-rise w-full max-w-[560px] overflow-hidden rounded-[var(--radius-r3)] border border-b2 bg-s1 shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-b1 px-4">
          <Search size={15} className="shrink-0 text-t4" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setCursor((c) => Math.min(c + 1, results.length - 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setCursor((c) => Math.max(c - 1, 0))
              }
              if (e.key === 'Enter' && results[cursor]) go(results[cursor].id)
            }}
            placeholder="Search snippets — try 'JWT auth' or 'async retry'"
            className="w-full bg-transparent py-4 text-[14px] text-t1 outline-none placeholder:text-t4"
          />
          <kbd className="shrink-0 rounded-[3px] border border-b2 bg-b1 px-[6px] py-px font-mono text-[10px] text-t3">
            ESC
          </kbd>
        </div>

        <ul className="max-h-[52vh] overflow-y-auto p-2">
          {searching ? (
            <li className="px-3 py-6 text-center text-[13px] text-t3">Searching…</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-t3">
              No snippets match “{query}”
            </li>
          ) : (
            results.map((snippet, i) => (
              <li key={snippet.id}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(snippet.id)}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-[var(--radius-r1)] px-3 py-2.5 text-left transition-colors',
                    i === cursor ? 'bg-b1' : 'hover:bg-b1',
                  )}
                >
                  <LanguageDot language={snippet.language} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-t1">
                      {snippet.title}
                    </span>
                    <span className="block truncate text-[11px] text-t3">{snippet.description}</span>
                  </span>
                  {i === cursor ? (
                    <CornerDownLeft size={13} className="shrink-0 text-t4" />
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}