import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { useTheme } from '@/hooks/useTheme'
import { Bot, Check, FilePlus2, Globe, Lock, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { InlineCode } from '@/components/ui/CodeBlock'
import { LanguageDot } from '@/components/ui/LanguageBadge'
import { aiApi, ApiError, messageOf, snippetsApi } from '@/lib/api'
import { LANGUAGE_OPTIONS, extensionFor, languageMeta, normalizeLanguage, slugify } from '@/lib/languages'
import { countLines, cx } from '@/lib/format'
import type { Language, Visibility } from '@/lib/types'

const SEED = `import { useState, useEffect } from 'react'

/**
 * Debounce any value by a given delay.
 * Useful for search inputs, API calls on keystroke.
 */
export function useDebounce<T>(
  value: T,
  delay: number = 500
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => clearTimeout(timer) // cleanup <- cursor here
  }, [value, delay])

  return debouncedValue
}`

const SUGGESTED_TAGS = ['hooks', 'typescript', 'react', 'debounce', 'utils', 'patterns']

/**
 * A failure from `/api/ai/explain` needs its own wording: the raw `detail` is either a
 * provider error string nobody can act on, or a 401/429 that looks identical in the
 * generic handler. The two common cases get a sentence; anything else falls through to
 * the server's message, which is better than a blank.
 */
function explainErrorCopy(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Sign in to use Explain with AI.'
    if (err.status === 429) return 'You’ve hit the rate limit — try again in a minute.'
    if (err.status === 502) {
      // The route forwards the provider's own message, which is the only thing
      // that can say *why* — a bad key, an unknown model id and an empty
      // response all land on 502 and are indistinguishable by status alone.
      return `${err.message} Your snippet is unaffected — save it and try again later.`
    }
  }
  return messageOf(err)
}

export function NewSnippetPage() {
  const navigate = useNavigate()
  const { isLight } = useTheme()
  const [params] = useSearchParams()

  // `/snippets/new?edit=<id>` turns this into the editor for an existing snippet.
  const editId = params.get('edit')

  const [language, setLanguage] = useState<Language>('typescript')
  const [code, setCode] = useState(SEED)
  const [title, setTitle] = useState('useDebounce hook')
  const [description, setDescription] = useState(
    'Debounce any value with configurable delay. Ideal for search inputs to avoid API call on every keystroke.',
  )
  const [tags, setTags] = useState(['hooks', 'typescript', 'react', 'debounce'])
  const [tagDraft, setTagDraft] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [explaining, setExplaining] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explainError, setExplainError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Editing starts from the stored snippet rather than the seed above.
  useEffect(() => {
    if (!editId) return
    let cancelled = false
    void (async () => {
      try {
        const existing = await snippetsApi.owned(editId)
        if (cancelled) return
        setTitle(existing.title)
        setDescription(existing.description ?? '')
        setCode(existing.code)
        setLanguage(normalizeLanguage(existing.language) || 'typescript')
        setTags(existing.tags.map((tag) => tag.name))
        setVisibility(existing.is_public ? 'public' : 'private')
        setExplanation(existing.ai_explanation)
      } catch (err) {
        if (!cancelled) setLoadError(messageOf(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editId])

  const filename = useMemo(
    () => `${slugify(title || 'snippet')}.${extensionFor(language)}`,
    [title, language],
  )
  const lines = countLines(code)

  function addTag(raw: string) {
    const value = raw.trim().replace(/^#/, '').toLowerCase()
    if (!value || tags.includes(value)) return
    setTags((prev) => [...prev, value])
  }

  function onEditorChange(value: string | undefined) {
    setCode(value ?? '')
  }

  // `/api/ai/explain` previews the code without saving anything; persisting it is
  // a separate call once there's a snippet id to attach it to.
  const explain = useCallback(async () => {
    if (!code.trim()) return
    setExplaining(true)
    setError(null)
    setExplainError(null)
    try {
      const res = await aiApi.explain({ code, language, title: title || undefined })
      setExplanation(res.explanation)
    } catch (err) {
      // Its own message, next to the button. Sharing `error` with the save path buried
      // an AI failure at the bottom of the sidebar, where it read as a dead button.
      setExplainError(explainErrorCopy(err))
    } finally {
      setExplaining(false)
    }
  }, [code, language, title])

  async function save(publish: boolean) {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        code,
        language,
        is_public: publish ? true : visibility === 'public',
        tags,
      }
      const saved = editId
        ? await snippetsApi.update(editId, payload)
        : await snippetsApi.create(payload)

      // Only attach the preview explanation if the user asked for one — otherwise
      // the ad-hoc text would overwrite whatever was already stored.
      if (explanation && !saved.ai_explanation) {
        await snippetsApi.explain(saved.id).catch(() => {})
      }

      navigate(`/snippet/${saved.id}`, { replace: true })
    } catch (err) {
      setError(messageOf(err))
      setSaving(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-[1fr_320px] max-lg:grid-cols-1">
      {/* ---------- editor ---------- */}
      <div className="flex flex-col border-r border-b1 max-lg:border-r-0">
        <div className="flex items-stretch bg-s1">
          <div className="flex cursor-pointer items-center gap-2 border-r border-b1 border-b-2 border-b-lime bg-[color-mix(in_srgb,var(--lime)_3%,transparent)] px-4 py-3 font-mono text-[12px] text-t1">
            <LanguageDot language={language} />
            {filename}
          </div>
          {/* This screen is already the new-snippet form, so there is no second
              tab to switch to. */}
          <div className="flex items-center gap-2 border-r border-b-1 border-b-2 border-b-transparent px-4 py-3 font-mono text-[12px] text-t4">
            <FilePlus2 size={12} />
            {editId ? 'Editing' : 'Untitled'}
          </div>
        </div>

        <div className="relative min-h-[500px] flex-1 bg-[color-mix(in_srgb,var(--bg)_85%,transparent)]">
          <Editor
            height="100%"
            defaultLanguage={language}
            // Monaco logs a warning and drops to plaintext for an id it has no grammar
            // for, and a language the user typed in won't have one.
            language={LANGUAGE_OPTIONS.some((l) => l.id === language) ? language : 'plaintext'}
            value={code}
            onChange={onEditorChange}
            theme={isLight ? 'vs' : 'vs-dark'}
            options={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 13,
              lineHeight: 22,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 20 },
              renderLineHighlight: 'gutter',
              smoothScrolling: true,
              tabSize: 2,
              automaticLayout: true,
              fontLigatures: true,
            }}
          />
        </div>

        <div className="flex items-center gap-3 border-t border-b1 bg-s1 px-5 py-3">
          <div className="flex gap-4 font-mono text-[11px] text-t3">
            <span>{languageMeta(language).label}</span>
            <span>{lines} lines</span>
            <span>UTF-8</span>
            <span>LF</span>
          </div>
          <button
            type="button"
            onClick={explain}
            disabled={explaining}
            className="ml-auto flex cursor-pointer items-center gap-2 rounded-[var(--radius-r1)] border border-[color-mix(in_srgb,var(--purple)_25%,transparent)] bg-[color-mix(in_srgb,var(--purple)_10%,transparent)] px-3.5 py-[7px] text-[12px] font-medium text-purple transition-colors hover:bg-[color-mix(in_srgb,var(--purple)_18%,transparent)] disabled:opacity-60"
          >
            <Bot size={13} />
            {explaining ? 'Explaining…' : 'Explain with AI'}
          </button>
        </div>

        {explainError ? (
          <p
            role="alert"
            className="border-t border-b1 bg-[color-mix(in_srgb,var(--red)_8%,transparent)] px-5 py-2.5 text-[12px] text-red"
          >
            {explainError}
          </p>
        ) : null}
      </div>

      {/* ---------- metadata panel ---------- */}
      <aside className="flex flex-col gap-5 overflow-y-auto bg-s1 p-6">
        <Panel label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What should this be called?"
            className={PANEL_INPUT}
          />
        </Panel>

        <Panel label="Description" note="optional">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this snippet do?"
            rows={4}
            className={cx(PANEL_INPUT, 'h-[88px] resize-none text-[12px] leading-[1.6] text-t2')}
          />
        </Panel>

        <Panel label="Language" note="type any">
          <LanguagePicker value={language} onChange={setLanguage} />
        </Panel>

        <Panel label="Tags" note="press Enter">
          <div
            className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-[var(--radius-r1)] border border-b1 bg-s2 p-1.5"
            onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-[4px] border border-[color-mix(in_srgb,var(--lime)_20%,transparent)] bg-[color-mix(in_srgb,var(--lime)_8%,transparent)] px-2 py-0.5 font-mono text-[11px] text-lime"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="cursor-pointer text-[10px] text-t3 hover:text-t1"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addTag(tagDraft)
                  setTagDraft('')
                }
                if (e.key === 'Backspace' && !tagDraft && tags.length) {
                  setTags((prev) => prev.slice(0, -1))
                }
              }}
              placeholder={tags.length ? '' : 'hooks, react…'}
              className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 font-mono text-[11px] text-t1 outline-none placeholder:text-t4"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="cursor-pointer rounded-[4px] bg-b1 px-1.5 py-0.5 font-mono text-[10px] text-t3 transition-colors hover:text-lime"
              >
                + {tag}
              </button>
            ))}
          </div>
        </Panel>

        <Panel label="Visibility">
          <div className="flex overflow-hidden rounded-[var(--radius-r1)] border border-b1">
            {(['public', 'private'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={cx(
                  'flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-[7px] text-center font-mono text-[12px] transition-all duration-150',
                  visibility === v ? 'bg-b1 text-t1' : 'text-t2 hover:text-t1',
                )}
              >
                {v === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                {v === 'public' ? 'Public' : 'Private'}
              </button>
            ))}
          </div>
        </Panel>

        {explanation ? (
          <section className="border-b border-b1 pb-5">
            <div className="mb-2.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.5px] text-purple">
              <Bot size={12} />
              AI Explanation
            </div>
            <div className="rounded-[var(--radius-r2)] border border-[color-mix(in_srgb,var(--purple)_20%,transparent)] bg-[color-mix(in_srgb,var(--purple)_6%,transparent)] p-3.5">
              <div className="mb-2 font-mono text-[11px] tracking-[0.5px] text-purple">
                ✦ Generated explanation
              </div>
              <p className="text-[12px] leading-[1.7] text-t2">
                {explanation.split(/(`[^`]+`)/g).map((part, i) =>
                  part.startsWith('`') && part.endsWith('`') ? (
                    <InlineCode key={i}>{part.slice(1, -1)}</InlineCode>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </p>
            </div>
          </section>
        ) : null}

        {error || loadError ? (
          <p role="alert" className="text-[12px] text-t3">
            {error ?? loadError}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          {/* A snippet is either public or private — "draft" is the private state,
              so this pair is really publish / keep-private. */}
          <Button
            size="lg"
            onClick={() => void save(true)}
            disabled={!title.trim() || !code.trim() || saving}
          >
            {saving ? 'Saving…' : editId ? 'Save changes →' : 'Publish snippet →'}
          </Button>
          <Button
            variant="outline"
            onClick={() => void save(false)}
            disabled={!title.trim() || saving}
          >
            Save as draft
          </Button>
        </div>
      </aside>
    </div>
  )
}

const PANEL_INPUT =
  'w-full rounded-[var(--radius-r1)] border border-b1 bg-s2 px-3 py-2.5 text-[13px] text-t1 outline-none transition-colors duration-200 placeholder:text-t4 focus:border-[color-mix(in_srgb,var(--lime)_35%,transparent)]'

/** The backend validates `language` as 1–50 chars, so the field stops there. */
const LANGUAGE_MAX = 50

/**
 * Language chooser.
 *
 * A text field with the curated list as suggestions: the backend stores a free string
 * (`models/snippets_model.py` — `Column(String)`), so anything the user types is
 * stored as typed and rendered with a generated colour and label by `languageMeta`.
 * The previous six-button grid made every other language unreachable.
 */
function LanguagePicker({ value, onChange }: { value: Language; onChange: (next: Language) => void }) {
  const [draft, setDraft] = useState(value)
  const [open, setOpen] = useState(false)

  // The field is the source of truth while the user is in it; the stored value only
  // catches up when they commit one.
  useEffect(() => {
    setDraft(value)
  }, [value])

  const needle = draft.trim().toLowerCase()
  const matches = LANGUAGE_OPTIONS.filter(
    (option) => !needle || option.label.toLowerCase().includes(needle) || option.id.includes(needle),
  )
  // A language already chosen that isn't in the curated list still shows as a chip, so
  // editing a snippet saved as `elixir` doesn't silently lose that selection.
  const custom = value && !LANGUAGE_OPTIONS.some((option) => option.id === value)

  function commit(raw: string) {
    const next = normalizeLanguage(raw)
    if (next) onChange(next)
    else setDraft(value)
  }

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 rounded-[4px] px-[7px] py-0.5 font-mono text-[10px] font-semibold" style={chipStyle(languageMeta(value))}>
          {languageMeta(value).label}
        </span>
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Commit on blur so a typed language survives a click straight to Save.
            commit(draft)
            setOpen(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(draft)
              setOpen(false)
            }
            if (e.key === 'Escape') {
              setDraft(value)
              setOpen(false)
            }
          }}
          maxLength={LANGUAGE_MAX}
          placeholder="Type a language…"
          aria-label="Language"
          className={cx(PANEL_INPUT, 'py-1.5 font-mono text-[12px]')}
        />
      </div>

      {custom ? (
        <p className="mb-2 font-mono text-[10px] text-t4">
          “{value}” isn’t one of the presets — it’s saved and shown as typed.
        </p>
      ) : null}

      {open && matches.length ? (
        <ul className="max-h-[180px] overflow-y-auto rounded-[var(--radius-r1)] border border-b1 bg-s2 p-1">
          {matches.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                // `onMouseDown` fires before the input's blur, so the click isn't lost.
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(option.id)
                  setDraft(option.id)
                  setOpen(false)
                }}
                className={cx(
                  'flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-r1)] px-2 py-1.5 text-left font-mono text-[11px] transition-colors hover:bg-b1',
                  option.id === value ? 'text-lime' : 'text-t2',
                )}
              >
                <LanguageDot language={option.id} />
                <span className="flex-1 truncate">{option.label}</span>
                {option.id === value ? <Check size={11} /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** The badge's inline background/foreground, which Tailwind can't express from a token. */
function chipStyle(meta: ReturnType<typeof languageMeta>) {
  return { background: meta.softBg, color: meta.color }
}

function Panel({
  label,
  note,
  children,
}: {
  label: string
  note?: string
  children: ReactNode
}) {
  return (
    <section className="border-b border-b1 pb-5">
      <div className="mb-2.5 flex items-center justify-between font-mono text-[11px] font-medium uppercase tracking-[0.5px] text-t3">
        <span>{label}</span>
        {note ? <span className="text-[10px] font-normal normal-case text-t4">{note}</span> : null}
      </div>
      {children}
    </section>
  )
}