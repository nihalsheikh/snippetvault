import type { ReactNode } from 'react'
import { highlight, TOKEN_COLOR, type Token } from '@/lib/highlight'
import { cx } from '@/lib/format'
import type { Language } from '@/lib/types'

interface CodePreviewProps {
  code: string
  language: Language
  /** Lines rendered before the ellipsis, matching the card preview height. */
  maxLines?: number
  className?: string
}

/** Read-only highlighted code, used on cards, the auth panel and detail views. */
export function CodePreview({ code, language, maxLines = 5, className }: CodePreviewProps) {
  const lines = code.split('\n')
  const shown = maxLines ? lines.slice(0, maxLines) : lines
  const truncated = lines.length > shown.length

  return (
    // Substitutes rather than merges. All three callers pass their own padding,
    // background and font size to replace the defaults outright; merging would
    // leave both `p-3.5` and `p-0` in the class list and let the stylesheet's
    // source order decide the winner. `CodeWithLineNumbers` below merges instead,
    // because its layout is structural and has to survive being restyled.
    <pre
      className={
        className ??
        'border-b border-b1 bg-[color-mix(in_srgb,var(--bg)_60%,transparent)] px-3.5 py-3 font-mono text-[11px] leading-[1.7] text-t2'
      }
    >
      <code>
        {shown.map((_, i) => (
          <CodeLine key={i} tokens={highlight(lines[i], language)[0]} />
        ))}
        {truncated ? <span className="text-t4">{'…'}</span> : null}
      </code>
    </pre>
  )
}

export function CodeLine({ tokens }: { tokens: Token[] }) {
  return (
    <>
      {tokens.map((token, i) =>
        token.cls ? (
          <span key={i} style={{ color: TOKEN_COLOR[token.cls] }}>
            {token.text}
          </span>
        ) : (
          <span key={i}>{token.text}</span>
        ),
      )}
      {'\n'}
    </>
  )
}

/** Full block with a gutter of line numbers, as used on the detail screen. */
export function CodeWithLineNumbers({
  code,
  language,
  className,
}: {
  code: string
  language: Language
  className?: string
}) {
  const lines = highlight(code, language)
  return (
    // `className` is merged, not substituted. The grid is what puts the gutter
    // beside the code — a caller passing only colours and padding used to replace
    // the whole thing, which stacked the two and pushed the code below the
    // numbers. Merging keeps the layout a caller cannot see but always needs.
    <div
      className={cx(
        'grid grid-cols-[32px_1fr] px-6 py-6 font-mono text-[13px] leading-[1.8] text-t2',
        className,
      )}
    >
      <div className="select-none pr-4 text-right text-[12px] text-t4" aria-hidden="true">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre className="overflow-x-auto">
        <code>
          {lines.map((tokens, i) => (
            <CodeLine key={i} tokens={tokens} />
          ))}
        </code>
      </pre>
    </div>
  )
}

/** Inline `<code>` inside AI explanation prose. */
export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code
      className="rounded-[3px] bg-[color-mix(in_srgb,var(--purple)_12%,transparent)] px-1 py-px font-mono text-[11px] text-purple"
    >
      {children}
    </code>
  )
}