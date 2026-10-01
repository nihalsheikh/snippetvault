import { Link } from 'react-router-dom'
import { Flame, MoreHorizontal } from 'lucide-react'
import type { Snippet } from '@/lib/types'
import { formatNumber } from '@/lib/format'
import { languageMeta } from '@/lib/languages'
import { highlight, TOKEN_COLOR } from '@/lib/highlight'
import { Tag } from './Chip'

/** The first few lines of a snippet, highlighted for the card preview. */
function CardCode({ snippet, lines = 4 }: { snippet: Snippet; lines?: number }) {
  const source = snippet.code.split('\n').slice(0, lines)
  return (
    <div className="border-b border-b1 bg-[color-mix(in_srgb,var(--bg)_45%,transparent)] px-3.5 py-3 font-mono text-[11px] leading-[1.7] text-t2">
      {source.map((line, i) => (
        <div key={i} className="truncate">
          {highlight(line, snippet.language)[0].map((token, j) =>
            token.cls ? (
              <span key={j} style={{ color: TOKEN_COLOR[token.cls] }}>
                {token.text}
              </span>
            ) : (
              <span key={j}>{token.text}</span>
            ),
          )}
        </div>
      ))}
    </div>
  )
}

export function SnippetCard({
  snippet,
  trendingRank,
  showAuthor = false,
}: {
  snippet: Snippet
  trendingRank?: number
  showAuthor?: boolean
}) {
  const meta = languageMeta(snippet.language)

  return (
    <article
      className={cx(
        'group relative flex flex-col overflow-hidden rounded-[var(--radius-r2)] border border-b1 bg-s1 transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-b2 hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]',
        trendingRank === 1 && 'border-[color-mix(in_srgb,var(--lime)_18%,transparent)]',
      )}
    >
      {trendingRank ? (
        <div className="flex items-center gap-1.5 border-b border-[color-mix(in_srgb,var(--lime)_10%,transparent)] bg-[color-mix(in_srgb,var(--lime)_5%,transparent)] px-2.5 py-[3px] font-mono text-[9px] tracking-[1px] text-lime">
          <Flame size={10} strokeWidth={2.5} />
          TRENDING #{trendingRank}
        </div>
      ) : null}

      <div className="flex items-start gap-2.5 border-b border-b1 p-3.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-r1)] font-mono text-[11px] font-semibold"
          style={{ background: meta.softBg, color: meta.color }}
          aria-hidden="true"
        >
          {meta.short}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-semibold">
            <Link
              to={`/snippet/${snippet.id}`}
              className="text-t1 no-underline after:absolute after:inset-0 after:content-[''] hover:text-lime"
            >
              {snippet.title}
            </Link>
          </h3>
          <p className="truncate text-[11px] text-t3">{snippet.description}</p>
        </div>
        <button
          type="button"
          aria-label={`Options for ${snippet.title}`}
          className="relative z-10 shrink-0 rounded p-0.5 text-t4 transition-colors hover:text-t1"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <CardCode snippet={snippet} />

      <div className="flex flex-1 items-center gap-2 p-3">
        <LanguageBadge language={snippet.language} />
        {snippet.tags.slice(0, 2).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
        <div className="ml-auto flex items-center gap-3 font-mono text-[11px] text-t3">
          {showAuthor ? (
            <span className="text-t4">@{snippet.author.username}</span>
          ) : null}
          <span className="flex items-center gap-1">
            <CopyCountIcon />
            {formatNumber(snippet.copies)}
          </span>
        </div>
      </div>

      </article>
  )
}

function CopyCountIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}