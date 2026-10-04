import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  Copy,
  FileText,
  Globe,
  Lock,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { InlineCode, CodeWithLineNumbers } from '@/components/ui/CodeBlock'
import { LanguageBadge } from '@/components/ui/LanguageBadge'
import { LoaderPanel } from '@/components/ui/Loader'
import { NotFoundPage } from './NotFoundPage'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, commentsApi, communityApi, messageOf, snippetsApi } from '@/lib/api'
import { authorMap, toComment, toSnippet, toSnippets } from '@/lib/mappers'
import { extensionFor, languageMeta, slugify } from '@/lib/languages'
import { commentRefusal } from '@/lib/moderation'
import {
  avatarGradient,
  countLines,
  cx,
  formatDate,
  formatNumber,
  initialsOf,
  relativeTime,
} from '@/lib/format'
import type { Author, Comment, Snippet } from '@/lib/types'

const COMMENT_LIMIT = 2000

export function SnippetDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { status, profile } = useAuth()

  const [snippet, setSnippet] = useState<Snippet | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [similar, setSimilar] = useState<Snippet[]>([])
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setNotFound(false)
    setError(null)

    try {
      // The owned endpoint covers private snippets and public ones alike; the public
      // one is the fallback for anyone signed out or looking at someone else's.
      let dto
      if (status === 'authed') {
        try {
          dto = await snippetsApi.owned(id)
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404) throw err
          dto = await snippetsApi.publicOne(id)
        }
      } else {
        dto = await snippetsApi.publicOne(id)
      }

      const mapped = toSnippet(dto)

      // Author names come from the community roster — `SnippetDetails` carries only
      // the id — plus this snippet's comments, which nest their own author.
      const [people, thread, near] = await Promise.all([
        communityApi
          .users({ limit: 100 })
          .catch(() => ({ items: [], total: 0, hasNext: false })),
        commentsApi.list(id, { limit: 50 }),
        snippetsApi
          .publicList({ language: mapped.language, limit: 4 })
          .catch(() => ({ items: [], total: 0, hasNext: false })),
      ])

      const map = authorMap(people.items)
      for (const comment of thread.items) map.set(comment.author.id, toComment(comment).author)

      setSnippet({ ...mapped, author: map.get(mapped.authorId) ?? mapped.author })
      setComments(thread.items.map(toComment))
      setSimilar(
        toSnippets(
          near.items.filter((d) => d.id !== id),
          map,
        ).slice(0, 3),
      )
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true)
      else setError(messageOf(err))
    }
  }, [id, status])

  useEffect(() => {
    void load()
  }, [load])

  const isOwner = Boolean(profile && snippet && snippet.authorId === profile.id)

  async function copy() {
    if (!snippet) return
    try {
      await navigator.clipboard.writeText(snippet.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked (insecure context) — the raw view is still available.
      return
    }
    // The counter is server-side; take its word for the new total rather than
    // guessing. A failure here doesn't affect the copy the user just made.
    try {
      const result = await snippetsApi.copy(snippet.id)
      setSnippet((current) => (current ? { ...current, copies: result.copy_count } : current))
    } catch {
      /* clipboard already has the code — a missed counter bump is not worth an error */
    }
  }

  function download() {
    if (!snippet) return
    const blob = new Blob([snippet.code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${slugify(snippet.title)}.${extensionFor(snippet.language)}`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: snippet?.title, url })
      else {
        await navigator.clipboard.writeText(url)
        // Its own state, not `copied`. Sharing used to flip the *Copy snippet*
        // button into its "Copied" state, so clicking Share lit up the button
        // next to it and read as though the code — not the link — had been copied.
        setShared(true)
        window.setTimeout(() => setShared(false), 1800)
      }
    } catch {
      /* the user dismissed the sheet, or the clipboard is blocked */
    }
  }

  async function explain() {
    if (!snippet) return
    setExplaining(true)
    setExplainError(null)
    try {
      // The per-snippet endpoint writes to `ai_explanation`, so the explanation
      // survives a reload — unlike the ad-hoc one.
      await snippetsApi.explain(snippet.id)
      await load()
    } catch (err) {
      setExplainError(messageOf(err))
    } finally {
      setExplaining(false)
    }
  }

  async function removeComment(comment: Comment) {
    // Optimistic: the list reloads either way, so a failed delete self-corrects.
    setComments((prev) => prev.filter((c) => c.id !== comment.id))
    try {
      await commentsApi.remove(comment.id)
    } catch (err) {
      setError(messageOf(err))
      void load()
    }
  }

  async function destroySnippet() {
    if (!snippet) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await snippetsApi.remove(snippet.id)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setDeleteError(messageOf(err))
      setDeleting(false)
    }
  }

  if (notFound) return <NotFoundPage />

  const meta = snippet ? languageMeta(snippet.language) : null
  const filename = snippet ? `${slugify(snippet.title)}.${extensionFor(snippet.language)}` : ''
  const me: Author = profile
    ? {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        // An account with no display name still gets readable initials from its
        // handle, and the same seeded colour the rest of the app gives it.
        initials: initialsOf(profile.name) || initialsOf(profile.username) || '?',
        avatarGradient: avatarGradient(profile.id),
        profileImage: profile.profileImage,
      }
    : { id: '', name: 'You', username: 'you', initials: '?', avatarGradient: avatarGradient('') }

  return (
    <>
      {/* No top bar of its own: `AppLayout` renders one for this route. A second would
          double the header, and two bars would both claim `sticky top-0`. */}
      <div className="flex justify-end gap-2 max-lg:hidden">
        <RightActions isOwner={isOwner} />
      </div>

      <div className="mx-auto grid max-w-[1100px] grid-cols-[1fr_320px] gap-6 px-7 py-8 max-lg:grid-cols-1 max-lg:px-4">
        {/* ---------- main column ---------- */}
        <div className="min-w-0">
          {!snippet ? (
            error ? (
              <div className="flex min-h-[50vh] items-center justify-center px-6 text-center">
                <span className="text-[13px] text-t2">{error}</span>
              </div>
            ) : (
              <LoaderPanel label="Loading snippet" />
            )
          ) : (
            <>
              <nav className="mb-3 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-t3">
                <Link to="/dashboard" className="text-t2 no-underline hover:text-t1">
                  Library
                </Link>
                <ChevronRight size={11} className="text-t4" />
                <Link
                  to={`/dashboard?lang=${snippet.language}`}
                  className="text-t2 no-underline hover:text-t1"
                >
                  {meta?.label}
                </Link>
                <ChevronRight size={11} className="text-t4" />
                <span className="truncate">{snippet.title}</span>
              </nav>

              <h1 className="mb-2 font-serif text-[28px] font-normal tracking-[-0.5px]">
                {snippet.title}
              </h1>
              <p className="mb-3.5 text-[14px] text-t2">{snippet.description}</p>

              <div className="mb-5 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-2 text-[13px] text-t2">
                  <Avatar author={snippet.author} size="xs" />
                  <span className="font-medium">{snippet.author.username}</span>
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-t3">
                  <Copy size={11} />
                  <strong className="font-semibold text-t2">{formatNumber(snippet.copies)}</strong>{' '}
                  copies
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
                {/* One line when there's room; on a phone the buttons wrap onto their
                    own row rather than scrolling off the right edge — "Copy snippet"
                    is the main action here and it should never be the thing you can't
                    reach. `sv-scroll-x` still covers the odd narrow case where the
                    three buttons themselves can't fit. */}
                <div className="sv-scroll-x flex flex-wrap items-center gap-2.5 border-b border-b1 bg-s2 px-4 py-2.5 max-sm:gap-y-2">
                  <span className="font-mono text-[11px] font-semibold text-lime">
                    {meta?.label}
                  </span>
                  <span className="font-mono text-[11px] text-t3">{filename}</span>
                  <div className="ml-auto flex shrink-0 gap-2 max-sm:ml-0 max-sm:w-full max-sm:justify-end">
                    <CodeBarButton icon={<FileText size={11} />} onClick={download}>
                      Download
                    </CodeBarButton>
                    <CodeBarButton
                      icon={shared ? <Check size={11} /> : <Share2 size={11} />}
                      onClick={share}
                    >
                      {shared ? 'Link copied' : 'Share'}
                    </CodeBarButton>
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

                {status === 'authed' ? (
                  <CommentForm snippetId={snippet.id} me={me} onPosted={setComments} />
                ) : (
                  <p className="mb-5 rounded-[var(--radius-r1)] border border-b1 bg-s1 px-3.5 py-3 text-[13px] text-t3">
                    <Link to="/auth" className="font-semibold text-lime">
                      Sign in
                    </Link>{' '}
                    to join the conversation.
                  </p>
                )}

                {comments.length === 0 ? (
                  <p className="text-[13px] text-t3">No comments yet.</p>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar author={comment.author} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold">
                            {comment.author.username}
                            <span className="font-mono text-[11px] font-normal text-t3">
                              {relativeTime(comment.createdAt)}
                            </span>
                            {profile && comment.author.id === profile.id ? (
                              <button
                                type="button"
                                onClick={() => void removeComment(comment)}
                                aria-label="Delete your comment"
                                className="ml-auto cursor-pointer text-t4 transition-colors hover:text-red"
                              >
                                <Trash2 size={12} />
                              </button>
                            ) : null}
                          </div>
                          <p className="text-[13px] leading-[1.65] whitespace-pre-wrap text-t2">
                            {comment.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* ---------- right column ---------- */}
        {snippet && meta ? (
          <aside className="min-w-0">
            {snippet.aiExplanation ? (
              <div className="mb-4 rounded-[var(--radius-r2)] border border-[color-mix(in_srgb,var(--purple)_20%,transparent)] bg-[color-mix(in_srgb,var(--purple)_6%,transparent)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-r1)] bg-[color-mix(in_srgb,var(--purple)_15%,transparent)]">
                    <Sparkles size={13} className="text-purple" />
                  </span>
                  <span className="text-[13px] font-semibold text-purple">SnippetVault AI</span>
                </div>
                <Explanation text={snippet.aiExplanation} />
              </div>
            ) : null}

            {isOwner ? (
              <div className="mb-4 rounded-[var(--radius-r2)] border border-b1 bg-s1 p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  disabled={explaining}
                  onClick={() => void explain()}
                >
                  <Sparkles size={13} className="mr-1.5" />
                  {explaining ? 'Explaining…' : 'Explain with SnippetVault AI'}
                </Button>
                {explainError ? (
                  <p className="mt-2 text-[11px] text-t3">{explainError}</p>
                ) : null}

                {/* Deleting cascades to the snippet's comments and its collection
                    memberships server-side, so the author gets told. */}
                <div className="mt-4 border-t border-b1 pt-3.5">
                  {confirmDelete ? (
                    <div className="flex flex-col items-start gap-2.5">
                      <p className="text-[12px] leading-[1.6] text-t2">
                        Delete &ldquo;{snippet.title}&rdquo;? Its comments go with it and this
                        can&rsquo;t be undone.
                      </p>
                      {deleteError ? (
                        <p role="alert" className="text-[11px] text-t3">
                          {deleteError}
                        </p>
                      ) : null}
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={deleting}
                          onClick={() => void destroySnippet()}
                        >
                          {deleting ? 'Deleting…' : 'Delete permanently'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfirmDelete(false)
                            setDeleteError(null)
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-t3 transition-colors hover:text-red"
                    >
                      <Trash2 size={12} />
                      Delete snippet
                    </button>
                  )}
                </div>
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
                  <span className="text-lime">
                    {snippet.visibility === 'public' ? '◎ Public' : '◈ Private'}
                  </span>
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
        ) : null}
      </div>
    </>
  )
}

function RightActions({ isOwner }: { isOwner: boolean }) {
  return (
    <>
      {isOwner ? <EditButton /> : null}
      <Link to="/dashboard">
        <Button size="sm">Back to library</Button>
      </Link>
    </>
  )
}

/**
 * The editor screen lives at `/snippets/new`, so editing is that page pre-filled
 * rather than a separate route.
 */
function EditButton() {
  const { id = '' } = useParams()
  return (
    <Link to={`/snippets/new?edit=${encodeURIComponent(id)}`}>
      <Button variant="ghost" size="sm">
        Edit
      </Button>
    </Link>
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

function CommentForm({
  snippetId,
  me,
  onPosted,
}: {
  snippetId: string
  me: Author
  onPosted: React.Dispatch<React.SetStateAction<Comment[]>>
}) {
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Checked as the author types, so the button greys out before they try to post.
  // The backend refuses the same text with a 422; this only saves the round trip.
  const refusal = draft.trim() ? commentRefusal(draft) : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || posting || refusal) return
    setPosting(true)
    setError(null)
    try {
      const created = await commentsApi.create(snippetId, body)
      onPosted((prev) => [...prev, toComment(created)])
      setDraft('')
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setPosting(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} className="mb-5 flex gap-3">
        <Avatar author={me} size="md" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={COMMENT_LIMIT}
          placeholder="Add a comment..."
          aria-label="Add a comment"
          aria-describedby={refusal ? 'comment-refusal' : undefined}
          aria-invalid={refusal ? true : undefined}
          className="flex-1 rounded-[var(--radius-r2)] border border-b1 bg-s2 px-3.5 py-2.5 text-[13px] text-t1 outline-none transition-colors duration-200 placeholder:text-t4 focus:border-[color-mix(in_srgb,var(--lime)_35%,transparent)]"
        />
        <Button type="submit" size="sm" disabled={!draft.trim() || posting || !!refusal}>
          {posting ? 'Posting…' : 'Post'}
        </Button>
      </form>

      {refusal ? (
        <p
          id="comment-refusal"
          role="alert"
          className="-mt-2 mb-4 text-[12px] text-orange"
        >
          {refusal}
        </p>
      ) : error ? (
        <p className="-mt-2 mb-4 text-[12px] text-t3">{error}</p>
      ) : null}
    </>
  )
}