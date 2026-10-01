import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  Copy,
  FileText,
  Globe,
  Lock,
  Share2,
  Sparkles,
} from 'lucide-react'

import { AppTopBar } from '@/components/ui/Navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { InlineCode, CodeWithLineNumbers } from '@/components/ui/CodeBlock'
import { LanguageBadge } from '@/components/ui/LanguageBadge'
import { NotFoundPage } from './NotFoundPage'
import { commentsBySnippet, getSnippet, similarTo } from '@/lib/data'
import { EXTENSIONS, languageMeta, slugify } from '@/lib/languages'
import { countLines, cx, formatDate, formatNumber, relativeTime } from '@/lib/format'

const APP_LINKS = [
  { to: '/dashboard', label: 'My Snippets' },
  { to: '/community', label: 'Community' },
  { to: '/community', label: 'Explore' },
]

export function SnippetDetailPage() {
  const { id = '' } = useParams()
  const snippet = getSnippet(id)
  const [copied, setCopied] = useState(false)

  if (!snippet) return <NotFoundPage />

  const meta = languageMeta(snippet.language)
  const filename = `${slugify(snippet.title)}.${EXTENSIONS[snippet.language]}`
  const comments = commentsBySnippet[snippet.id] ?? []
  const similar = similarTo(snippet)

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet!.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked (insecure context) — the raw view is still available.
    }
  }

  function download() {
    const blob = new Blob([snippet!.code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <AppTopBar links={APP_LINKS} active="My Snippets" right={<RightActions />} />

      <div className="mx-auto grid max-w-[1100px] grid-cols-[1fr_320px] gap-6 px-7 py-8 max-lg:grid-cols-1">
        {/* ---------- main column ---------- */}
        <div className="min-w-0">
          <nav className="mb-3 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-t3">
            <Link to="/dashboard" className="text-t2 no-underline hover:text-t1">
              Library
            </Link>
            <ChevronRight size={11} className="text-t4" />
            <Link to={`/dashboard?lang=${snippet.language}`} className="text-t2 no-underline hover:text-t1">
              {meta.label}
            </Link>
            <ChevronRight size={11} className="text-t4" />
            <span className="truncate">{snippet.title}</span>
          </nav>

          <h1 className="mb-2 font-serif text-[28px] font-normal tracking-[-0.5px]">
            {snippet.title}
          </h1>
          <p className="mb-3.5 text-[14px] text-t2">{snippet.description}</p>

          <div className="mb-5 flex flex-wrap items-center gap-4">
            <Link
              to={`/community?author=${snippet.author.username}`}
              className="flex items-center gap-2 text-[13px] text-t2 no-underline hover:text-t1"
            >
              <Avatar author={snippet.author} size="xs" />
              <span className="font-medium">{snippet.author.username}</span>
            </Link>
            <span className="flex items-center gap-1 font-mono text-[11px] text-t3">
              <Copy size={11} />
              <strong className="font-semibold text-t2">{formatNumber(snippet.copies)}</strong> copies
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-t3">
              {snippet.visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
              {snippet.visibility === 'public' ? 'Public' : 'Private'}
            </span>
            <span className="font-mono text-[11px] text-t3">
              Updated {relativeTime(snippet.updatedAt)}
            </span>
            {snippet.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-[99px] bg-b1 px-2.5 py-[3px] font-mono text-[11px] text-t2"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* ---------- code ---------- */}
          <div className="overflow-hidden rounded-[var(--radius-r3)] border border-b1 bg-s1">
            <div className="flex items-center gap-2.5 border-b border-b1 bg-s2 px-4 py-2.5">
              <span className="font-mono text-[11px] font-semibold text-lime">{meta.label}</span>
              <span className="font-mono text-[11px] text-t3">{filename}</span>
              <div className="ml-auto flex gap-2">
                <CodeBarButton icon={<FileText size={11} />} onClick={download}>
                  Download
                </CodeBarButton>
                <CodeBarButton icon={<Share2 size={11} />}>Share</CodeBarButton>
                <CodeBarButton
                  icon={copied ? <Check size={11} /> : <Copy size={11} />}
                  onClick={copy}
                  accent
                >
                  {copied ? 'Copied' : 'Copy snippet'}
                </CodeBarButton>
              </div>
            </div>
            <CodeWithLineNumbers
              code={snippet.code}
              language={snippet.language}
              className="overflow-x-auto bg-[color-mix(in_srgb,var(--bg)_40%,transparent)] px-6 py-6 font-mono text-[13px] leading-[1.8] text-t2"
            />
          </div>

          {/* ---------- comments ---------- */}
          <section className="mt-7">
            <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold">
              Comments
              <span className="rounded-[4px] bg-b1 px-[7px] py-0.5 font-mono text-[11px] font-normal text-t3">
                {comments.length}
              </span>
            </h2>

            <CommentForm />

            <div className="mt-5 flex flex-col gap-3.5">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar author={comment.author} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-[12px] font-semibold">
                      {comment.author.username}
                      <span className="ml-1.5 font-mono text-[11px] font-normal text-t3">
                        {relativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-[13px] leading-[1.65] text-t2">{comment.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ---------- right column ---------- */}
        <aside className="min-w-0">
          {snippet.aiExplanation ? (
            <div className="mb-4 rounded-[var(--radius-r2)] border border-[color-mix(in_srgb,var(--purple)_20%,transparent)] bg-[color-mix(in_srgb,var(--purple)_6%,transparent)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-r1)] bg-[color-mix(in_srgb,var(--purple)_15%,transparent)]">
                  <Sparkles size={13} className="text-purple" />
                </span>
                <span className="text-[13px] font-semibold text-purple">AI Explanation</span>
              </div>
              <Explanation text={snippet.aiExplanation} />
            </div>
          ) : null}

          <div className="mb-4 rounded-[var(--radius-r2)] border border-b1 bg-s1 p-4">
            <h3 className="mb-3 font-mono text-[12px] font-semibold uppercase tracking-[0.5px] text-t2">
              Details
            </h3>
            <dl className="space-y-1.5 text-[12px]">
              <DetailRow label="Language">
                <span style={{ color: meta.color }}>{meta.label}</span>
              </DetailRow>
              <DetailRow label="Lines">{countLines(snippet.code)}</DetailRow>
              <DetailRow label="Visibility">
                <span className="text-lime">{snippet.visibility === 'public' ? '◎ Public' : '◈ Private'}</span>
              </DetailRow>
              <DetailRow label="Copies">
                <strong className="font-semibold">{formatNumber(snippet.copies)}</strong>
              </DetailRow>
              <DetailRow label="Created">
                <span className="text-t2">{formatDate(snippet.createdAt)}</span>
              </DetailRow>
            </dl>
          </div>

          {similar.length ? (
            <div className="rounded-[var(--radius-r2)] border border-b1 bg-s1 p-4">
              <h3 className="mb-3 font-mono text-[12px] font-semibold uppercase tracking-[0.5px] text-t2">
                Similar snippets
              </h3>
              <div className="flex flex-col gap-2.5">
                {similar.map((item) => (
                  <Link
                    key={item.id}
                    to={`/snippet/${item.id}`}
                    className="flex items-center gap-2 rounded-[var(--radius-r1)] p-2 no-underline transition-colors hover:bg-b1"
                  >
                    <LanguageBadge language={item.language} short />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-t1">
                        {item.title}
                      </span>
                      <span className="block font-mono text-[10px] text-t3">
                        ⎘ {formatNumber(item.copies)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  )
}

function RightActions() {
  return (
    <>
      <Button variant="ghost" size="sm">
        Edit
      </Button>
      <Link to="/dashboard">
        <Button size="sm">Back to library</Button>
      </Link>
    </>
  )
}

function CodeBarButton({
  icon,
  accent,
  onClick,
  children,
}: {
  icon: ReactNode
  accent?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-r1)] px-3 py-[5px] font-mono text-[11px] transition-colors',
        accent
          ? 'border border-[color-mix(in_srgb,var(--lime)_25%,transparent)] bg-[color-mix(in_srgb,var(--lime)_8%,transparent)] text-lime hover:bg-[color-mix(in_srgb,var(--lime)_16%,transparent)]'
          : 'border border-b1 bg-b1 text-t1 hover:border-b2 hover:bg-s3',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

/** Renders the explanation's `**bold**` leads and `` `code` `` spans. */
function Explanation({ text }: { text: string }) {
  const blocks = text.split('\n\n')

  return (
    <div className="space-y-2.5 text-[13px] leading-[1.75] text-t2">
      {blocks.map((block, i) => (
        <p key={i}>
          {block.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={j} className="font-medium text-t1">
                  {part.slice(2, -2)}
                </strong>
              )
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return <InlineCode key={j}>{part.slice(1, -1)}</InlineCode>
            }
            return <span key={j}>{part}</span>
          })}
        </p>
      ))}
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-t3">{label}</dt>
      <dd className="text-right font-mono text-t1">{children}</dd>
    </div>
  )
}

function CommentForm() {
  const [draft, setDraft] = useState('')
  const [posted, setPosted] = useState<string[]>([])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    setPosted((prev) => [...prev, draft.trim()])
    setDraft('')
  }

  return (
    <>
      <form onSubmit={submit} className="mb-5 flex gap-3">
        <Avatar author={{ id: 'me', name: 'You', username: 'me', initials: 'NS' }} size="md" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 rounded-[var(--radius-r2)] border border-b1 bg-s2 px-3.5 py-2.5 text-[13px] text-t1 outline-none transition-colors duration-200 placeholder:text-t4 focus:border-[color-mix(in_srgb,var(--lime)_35%,transparent)]"
        />
        <Button type="submit" size="sm" disabled={!draft.trim()}>
          Post
        </Button>
      </form>

      {posted.map((body, i) => (
        <div key={i} className="mb-3.5 flex gap-3">
          <Avatar
            author={{ id: 'me', name: 'You', username: 'me', initials: 'NS' }}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold">
              you
              <span className="font-mono text-[11px] font-normal text-t3">just now</span>
            </div>
            <p className="text-[13px] leading-[1.65] text-t2">{body}</p>
          </div>
        </div>
      ))}
    </>
  )
}