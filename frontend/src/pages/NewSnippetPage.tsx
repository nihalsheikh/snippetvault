import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { useTheme } from '@/hooks/useTheme'
import { Bot, Globe, Lock, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { InlineCode } from '@/components/ui/CodeBlock'
import { LanguageDot } from '@/components/ui/LanguageBadge'
import { CREATE_LANGUAGES, EXTENSIONS, languageMeta, slugify } from '@/lib/languages'
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

export function NewSnippetPage() {
  const navigate = useNavigate()
  const { isLight } = useTheme()

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
  const [explanation, setExplanation] = useState(
    "This hook wraps React's useState and useEffect to delay updating a value until the input stops changing for delay ms. The cleanup function clears the previous timer on each render, ensuring only the final value triggers an update.",
  )

  const filename = useMemo(
    () => `${slugify(title || 'snippet')}.${EXTENSIONS[language]}`,
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

  // Local stand-in for the explain endpoint; wired to /api/snippets/explain later.
  const explain = useCallback(() => {
    setExplaining(true)
    window.setTimeout(() => setExplaining(false), 900)
  }, [])

  function save(publish: boolean) {
    navigate('/dashboard', { state: { saved: publish ? 'published' : 'draft' } })
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
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 border-r border-b-1 border-b-2 border-b-transparent px-4 py-3 font-mono text-[12px] text-t2 transition-colors hover:text-t1"
          >
            <Plus size={12} className="text-t4" />
            New
          </button>
        </div>

        <div className="relative min-h-[500px] flex-1 bg-[color-mix(in_srgb,var(--bg)_85%,transparent)]">
          <Editor
            height="100%"
            defaultLanguage={language}
            language={language}
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

        <Panel label="Language">
          <div className="grid grid-cols-3 gap-1.5">
            {CREATE_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={cx(
                  'cursor-pointer rounded-[var(--radius-r1)] border px-1.5 py-[7px] text-center font-mono text-[11px] transition-all duration-150',
                  language === lang
                    ? 'border-[color-mix(in_srgb,var(--lime)_35%,transparent)] bg-[color-mix(in_srgb,var(--lime)_5%,transparent)] text-lime'
                    : 'border-b1 bg-s2 text-t2 hover:border-b2',
                )}
              >
                {languageMeta(lang).label}
              </button>
            ))}
          </div>
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

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={() => save(true)} disabled={!title.trim() || !code.trim()}>
            Publish snippet →
          </Button>
          <Button variant="outline" onClick={() => save(false)} disabled={!title.trim()}>
            Save as draft
          </Button>
        </div>
      </aside>
    </div>
  )
}

const PANEL_INPUT =
  'w-full rounded-[var(--radius-r1)] border border-b1 bg-s2 px-3 py-2.5 text-[13px] text-t1 outline-none transition-colors duration-200 placeholder:text-t4 focus:border-[color-mix(in_srgb,var(--lime)_35%,transparent)]'

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