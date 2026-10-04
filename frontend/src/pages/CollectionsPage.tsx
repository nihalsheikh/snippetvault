import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, Pencil, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { LanguageBadge } from '@/components/ui/LanguageBadge'
import { LoaderPanel } from '@/components/ui/Loader'
import { collectionsApi, messageOf, snippetsApi } from '@/lib/api'
import { toCollection, toSnippets } from '@/lib/mappers'
import { cx, formatDate, formatNumber } from '@/lib/format'
import type { Collection, Snippet } from '@/lib/types'

/** The backend caps `limit` at 100, so one request is the whole page. */
const PAGE = 100

/** The list of snippets offered in the "add" picker — the user's own library. */
const PICKER_LIMIT = 100

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [members, setMembers] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const result = await collectionsApi.list({ limit: PAGE })
      setCollections(result.items.map(toCollection))
      setTotal(result.total)
      // Keep a valid selection: keep the current one if it survived, otherwise fall
      // back to the newest — which also covers "the open collection was deleted".
      setSelected((current) =>
        current && result.items.some((c) => c.id === current)
          ? current
          : (result.items[0]?.id ?? null),
      )
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selected) {
      setMembers([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const result = await collectionsApi.snippets(selected, { limit: PAGE })
        if (!cancelled) setMembers(toSnippets(result.items))
      } catch (err) {
        if (!cancelled) setError(messageOf(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selected])

  const current = collections.find((c) => c.id === selected) ?? null

  async function create(name: string, description: string) {
    setBusy(true)
    setError(null)
    try {
      const created = toCollection(
        await collectionsApi.create({ name, description: description || null }),
      )
      setCollections((prev) => [created, ...prev])
      setSelected(created.id)
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function rename(collection: Collection, name: string, description: string) {
    setBusy(true)
    setError(null)
    try {
      const updated = toCollection(
        await collectionsApi.update(collection.id, { name, description: description || null }),
      )
      setCollections((prev) => prev.map((c) => (c.id === collection.id ? updated : c)))
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function destroy(collection: Collection) {
    setBusy(true)
    setError(null)
    try {
      await collectionsApi.remove(collection.id)
      setCollections((prev) => prev.filter((c) => c.id !== collection.id))
      setMembers([])
      setSelected((current_) => (current_ === collection.id ? null : current_))
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function addMember(snippetId: string) {
    if (!current) return
    setBusy(true)
    setError(null)
    try {
      await collectionsApi.addSnippet(current.id, snippetId)
      // Re-read rather than guess: the row's copy count and author come from the
      // server, and the endpoint does not echo the snippet back.
      const result = await collectionsApi.snippets(current.id, { limit: PAGE })
      setMembers(toSnippets(result.items))
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function removeMember(snippet: Snippet) {
    if (!current) return
    const previous = members
    // Optimistic — a failed delete puts the row back.
    setMembers((prev) => prev.filter((s) => s.id !== snippet.id))
    try {
      await collectionsApi.removeSnippet(current.id, snippet.id)
    } catch (err) {
      setError(messageOf(err))
      setMembers(previous)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-serif text-[24px] tracking-[-0.5px]">Collections</h1>
          <p className="font-mono text-[11px] text-t3">
            {formatNumber(total)} collection{total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="ml-auto">
          <NewCollectionForm onCreate={create} busy={busy} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mb-4 text-[12px] text-red">
          {error}
        </p>
      ) : null}

      {loading ? (
        <LoaderPanel label="Loading collections" className="py-16" />
      ) : collections.length === 0 ? (
        <EmptyCollections />
      ) : (
        <div className="grid grid-cols-[260px_1fr] gap-5 max-lg:grid-cols-1">
          <nav className="flex flex-col gap-1.5">
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => setSelected(collection.id)}
                aria-current={collection.id === selected ? 'true' : undefined}
                className={cx(
                  'cursor-pointer rounded-[var(--radius-r2)] border px-3.5 py-3 text-left transition-colors',
                  collection.id === selected
                    ? 'border-[color-mix(in_srgb,var(--lime)_30%,transparent)] bg-[color-mix(in_srgb,var(--lime)_5%,transparent)]'
                    : 'border-b1 bg-s1 hover:border-b2',
                )}
              >
                <div
                  className={cx(
                    'truncate text-[13px] font-semibold',
                    collection.id === selected ? 'text-lime' : 'text-t1',
                  )}
                >
                  {collection.name}
                </div>
                {collection.description ? (
                  <div className="mt-0.5 truncate text-[11px] text-t3">{collection.description}</div>
                ) : null}
              </button>
            ))}
          </nav>

          {current ? (
            <section className="min-w-0">
              <CollectionHeader
                collection={current}
                busy={busy}
                onSave={rename}
                onDelete={destroy}
              />

              <div className="mb-3 mt-6 flex items-center gap-2">
                <h2 className="font-mono text-[11px] uppercase tracking-[1.5px] text-t3">
                  Snippets
                </h2>
                <span className="rounded-[4px] bg-b1 px-[7px] py-0.5 font-mono text-[10px] text-t3">
                  {members.length}
                </span>
                <div className="ml-auto">
                  <AddSnippetPicker
                    existing={members}
                    busy={busy}
                    onAdd={addMember}
                  />
                </div>
              </div>

              {members.length === 0 ? (
                <EmptyCollection name={current.name} />
              ) : (
                <ul className="flex flex-col gap-2">
                  {members.map((snippet) => (
                    <li
                      key={snippet.id}
                      className="flex items-center gap-3 rounded-[var(--radius-r2)] border border-b1 bg-s1 px-3.5 py-3"
                    >
                      <LanguageBadge language={snippet.language} short />
                      <Link
                        to={`/snippet/${snippet.id}`}
                        className="min-w-0 flex-1 no-underline hover:text-lime"
                      >
                        <span className="block truncate text-[13px] font-medium text-t1">
                          {snippet.title}
                        </span>
                        <span className="block truncate text-[11px] text-t3">
                          {snippet.description}
                        </span>
                      </Link>
                      <span className="shrink-0 font-mono text-[11px] text-t3">
                        ⎘ {formatNumber(snippet.copies)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeMember(snippet)}
                        aria-label={`Remove ${snippet.title} from ${current.name}`}
                        className="shrink-0 cursor-pointer text-t4 transition-colors hover:text-red"
                      >
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Collection list & header
// ---------------------------------------------------------------------------

function CollectionHeader({
  collection,
  busy,
  onSave,
  onDelete,
}: {
  collection: Collection
  busy: boolean
  onSave: (collection: Collection, name: string, description: string) => Promise<void>
  onDelete: (collection: Collection) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(collection.name)
  const [description, setDescription] = useState(collection.description)

  // Re-sync on every selection change so the form never shows the previous
  // collection's values.
  useEffect(() => {
    setName(collection.name)
    setDescription(collection.description)
    setEditing(false)
  }, [collection])

  return (
    <div className="rounded-[var(--radius-r2)] border border-b1 bg-s1 p-4">
      {editing ? (
        <form
          className="flex flex-col gap-2.5"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!name.trim()) return
            await onSave(collection, name.trim(), description.trim())
            setEditing(false)
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Collection name"
            aria-label="Collection name"
            autoFocus
            className={INPUT}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
            placeholder="Description (optional)"
            aria-label="Collection description"
            className={INPUT}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!name.trim() || busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setName(collection.name)
                setDescription(collection.description)
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[16px] font-semibold">{collection.name}</h2>
            {collection.description ? (
              <p className="mt-0.5 text-[12px] text-t2">{collection.description}</p>
            ) : null}
            <p className="mt-1 font-mono text-[11px] text-t3">
              created {formatDate(collection.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Rename ${collection.name}`}
            title="Rename"
            className="shrink-0 cursor-pointer text-t3 transition-colors hover:text-t1"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => void onDelete(collection)}
            disabled={busy}
            aria-label={`Delete ${collection.name}`}
            title="Delete collection"
            className="shrink-0 cursor-pointer text-t3 transition-colors hover:text-red disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function NewCollectionForm({
  onCreate,
  busy,
}: {
  onCreate: (name: string, description: string) => Promise<void>
  busy: boolean
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={13} className="mr-1.5" />
        New collection
      </Button>
    )
  }

  return (
    <form
      className="flex flex-col gap-2.5 rounded-[var(--radius-r2)] border border-b1 bg-s1 p-3.5"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        await onCreate(name.trim(), description.trim())
        setName('')
        setDescription('')
        setOpen(false)
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        placeholder="Collection name"
        aria-label="New collection name"
        autoFocus
        className={INPUT}
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={255}
        placeholder="Description (optional)"
        aria-label="New collection description"
        className={INPUT}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!name.trim() || busy}>
          {busy ? 'Creating…' : 'Create'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Add-snippet picker
// ---------------------------------------------------------------------------

/**
 * Adds one of the signed-in user's snippets to the open collection. The picker
 * hides anything already in the collection, so the 409 the backend raises for a
 * duplicate can't be reached from here.
 */
function AddSnippetPicker({
  existing,
  busy,
  onAdd,
}: {
  existing: Snippet[]
  busy: boolean
  onAdd: (snippetId: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [library, setLibrary] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Load the library once per opening — it rarely changes while this is up.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const result = await snippetsApi.mine({ limit: PICKER_LIMIT })
        if (!cancelled) setLibrary(toSnippets(result.items))
      } catch (err) {
        if (!cancelled) setError(messageOf(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const memberIds = useMemo(() => new Set(existing.map((s) => s.id)), [existing])
  const needle = query.trim().toLowerCase()
  const candidates = useMemo(
    () =>
      library.filter((s) => {
        if (memberIds.has(s.id)) return false
        if (!needle) return true
        return (
          s.title.toLowerCase().includes(needle) ||
          s.tags.some((t) => t.toLowerCase().includes(needle))
        )
      }),
    [library, memberIds, needle],
  )

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={13} className="mr-1.5" />
        Add snippet
      </Button>
    )
  }

  return (
    <div className="w-[300px] rounded-[var(--radius-r2)] border border-b1 bg-s1 p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter your snippets…"
          aria-label="Filter your snippets"
          autoFocus
          className={cx(INPUT, 'py-1.5 text-[12px]')}
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="shrink-0 cursor-pointer text-t4 transition-colors hover:text-t1"
        >
          <X size={13} />
        </button>
      </div>

      {loading ? (
        <LoaderPanel label="Loading snippets" className="py-4" size={28} />
      ) : error ? (
        <p className="py-4 text-center text-[12px] text-red">{error}</p>
      ) : candidates.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-t3">
          {library.length === 0
            ? 'You have no snippets yet.'
            : needle
              ? 'Nothing matches that filter.'
              : 'Every one of your snippets is already here.'}
        </p>
      ) : (
        <ul className="max-h-[240px] overflow-y-auto">
          {candidates.map((snippet) => (
            <li key={snippet.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onAdd(snippet.id)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-r1)] px-2 py-2 text-left transition-colors hover:bg-b1 disabled:opacity-50"
              >
                <LanguageBadge language={snippet.language} short />
                <span className="min-w-0 flex-1 truncate text-[12px] text-t1">{snippet.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

function EmptyCollections() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-r2)] border border-dashed border-b2 py-16 text-center">
      <FolderOpen size={24} className="mb-3 text-t4" strokeWidth={1.5} />
      <p className="mb-1 text-[14px] font-medium text-t2">No collections yet</p>
      <p className="mb-5 max-w-[340px] text-[13px] text-t3">
        Collections group snippets you want to keep together — a reading list, a toolkit, a set
        for one project.
      </p>
      <Link to="/dashboard" className="text-[13px] font-semibold text-lime no-underline">
        Browse your snippets →
      </Link>
    </div>
  )
}

function EmptyCollection({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-r2)] border border-dashed border-b2 py-14 text-center">
      <FolderOpen size={22} className="mb-3 text-t4" strokeWidth={1.5} />
      <p className="mb-1 text-[13px] font-medium text-t2">{name} is empty</p>
      <p className="text-[12px] text-t3">Use “Add snippet” to put something in it.</p>
    </div>
  )
}

const INPUT =
  'w-full rounded-[var(--radius-r1)] border border-b1 bg-s2 px-3 py-2 text-[13px] text-t1 outline-none transition-colors duration-200 placeholder:text-t4 focus:border-[color-mix(in_srgb,var(--lime)_35%,transparent)]'