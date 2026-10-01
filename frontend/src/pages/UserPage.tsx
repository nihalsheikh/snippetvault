import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileCode2 } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { ButtonLink } from '@/components/ui/Button'
import { SnippetCard } from '@/components/ui/SnippetCard'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, communityApi, messageOf } from '@/lib/api'
import { toCommunityUser, toSnippets } from '@/lib/mappers'
import { formatDate, formatNumber } from '@/lib/format'
import type { Author, Snippet } from '@/lib/types'

/** The backend caps `limit` at 100; this is the page the roster's author list shows. */
const PAGE_SIZE = 60

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'missing' }
  | { kind: 'ready'; author: ReturnType<typeof toCommunityUser>; snippets: Snippet[]; total: number }

/**
 * Someone's public profile, reached from the community member list.
 *
 * The backend already answers both questions this needs — `GET /community/users/{id}`
 * for the identity and `GET /community/users/{id}/snippets` for the public snippets —
 * so nothing here reads or writes the signed-in account.
 */
export function UserPage() {
  const { id = '' } = useParams()
  const { profile } = useAuth()
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    if (!id) {
      setState({ kind: 'missing' })
      return
    }
    let cancelled = false
    setState({ kind: 'loading' })

    void (async () => {
      try {
        const [user, snippets] = await Promise.all([
          communityApi.user(id),
          communityApi.userSnippets(id, { limit: PAGE_SIZE }),
        ])
        if (cancelled) return
        setState({
          kind: 'ready',
          author: toCommunityUser(user),
          snippets: toSnippets(snippets.items),
          total: snippets.total,
        })
      } catch (err) {
        if (cancelled) return
        // A 404 here is an id nobody owns, not a broken page.
        if (err instanceof ApiError && err.status === 404) setState({ kind: 'missing' })
        else setState({ kind: 'error', message: messageOf(err) })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="animate-pulse font-mono text-[12px] text-t3">Loading profile…</span>
      </div>
    )
  }

  if (state.kind === 'missing') {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-1 font-serif text-[24px] tracking-[-0.5px]">No such member</p>
        <p className="mb-6 max-w-[360px] text-[13px] text-t3">
          This profile link points at an account that doesn't exist.
        </p>
        <ButtonLink to="/community" variant="outline">
          Back to Community
        </ButtonLink>
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-1 font-serif text-[24px] tracking-[-0.5px]">Couldn't load this profile</p>
        <p className="mb-6 max-w-[380px] text-[13px] text-t3">{state.message}</p>
        <ButtonLink to="/community" variant="outline">
          Back to Community
        </ButtonLink>
      </div>
    )
  }

  const { author, snippets, total } = state
  const isMe = profile?.id === author.id

  // `SnippetDetails` carries only `author_id`, so without this every card would fall
  // back to "Anonymous" — this page already knows who wrote them.
  const authors = useMemo(
    () => new Map([[author.id, author as Author]]),
    [author],
  )

  return (
    <div className="mx-auto max-w-[900px] px-6 py-9">
      <Link
        to="/community"
        className="mb-5 inline-flex items-center gap-1.5 font-mono text-[11px] text-t3 no-underline hover:text-t1"
      >
        <ArrowLeft size={12} />
        Community
      </Link>

      {/* Same cover and identity block as the settings profile, without the camera
          badge or the edit button — this is someone else's page. */}
      <div className="h-28 rounded-[var(--radius-r3)] border border-b1 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--lime)_8%,transparent),color-mix(in_srgb,var(--purple)_8%,transparent))]" />

      <div className="mb-8 mt-5 flex items-center gap-5 max-sm:flex-col max-sm:items-start">
        <Avatar author={author} size="xl" className="shrink-0 border-[3px] border-bg" />
        <div className="min-w-0 flex-1">
          <h1 className="mb-0.5 truncate font-serif text-[24px] tracking-[-0.5px]">
            {author.name}
          </h1>
          <div className="truncate font-mono text-[13px] text-t3">
            @{author.username} · joined {formatDate(author.createdAt)}
          </div>
          {author.bio ? (
            <p className="mt-1.5 text-[13px] leading-[1.6] text-t2">{author.bio}</p>
          ) : null}
        </div>
        {isMe ? (
          <ButtonLink to="/profile" variant="ghost" size="sm" className="shrink-0">
            View your profile →
          </ButtonLink>
        ) : null}
      </div>

      <div className="mb-5 flex items-center gap-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[1.5px] text-t3">Public snippets</h2>
        <span className="rounded-[4px] bg-b1 px-[7px] py-0.5 font-mono text-[10px] text-t3">
          {formatNumber(total)}
        </span>
      </div>

      {snippets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-r2)] border border-dashed border-b2 py-16 text-center">
          <FileCode2 size={22} className="mb-3 text-t4" strokeWidth={1.5} />
          <p className="mb-1 text-[14px] font-medium text-t2">Nothing public yet</p>
          <p className="max-w-[340px] text-[13px] text-t3">
            {isMe
              ? 'Your private snippets stay yours — publish one to show it here.'
              : `${author.name} hasn't published any snippets.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {snippets.map((snippet) => (
            <SnippetCard key={snippet.id} snippet={snippet} showAuthor authors={authors} />
          ))}
        </div>
      )}
    </div>
  )
}
