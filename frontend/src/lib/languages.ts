import { KNOWN_LANGUAGES, type KnownLanguage, type Language } from './types'

export interface LanguageMeta {
  id: Language
  label: string
  short: string
  /** CSS colour used for the language dot / badge */
  color: string
  /** `rgba()` background at 10% opacity, matching the design's badge fills */
  softBg: string
}

export const LANGUAGES: Record<KnownLanguage, LanguageMeta> = {
  typescript: { id: 'typescript', label: 'TypeScript', short: 'TS', color: '#22d3ee', softBg: 'rgba(34,211,238,0.1)' },
  javascript: { id: 'javascript', label: 'JavaScript', short: 'JS', color: '#fbbf24', softBg: 'rgba(251,191,36,0.1)' },
  python: { id: 'python', label: 'Python', short: 'PY', color: '#fbbf24', softBg: 'rgba(250,204,21,0.1)' },
  rust: { id: 'rust', label: 'Rust', short: 'RS', color: '#fb923c', softBg: 'rgba(251,146,60,0.1)' },
  go: { id: 'go', label: 'Go', short: 'GO', color: '#61dafb', softBg: 'rgba(97,218,251,0.1)' },
  sql: { id: 'sql', label: 'SQL', short: 'SQL', color: '#a78bfa', softBg: 'rgba(167,139,250,0.1)' },
  bash: { id: 'bash', label: 'Bash', short: 'SH', color: '#4ade80', softBg: 'rgba(74,222,128,0.1)' },
  json: { id: 'json', label: 'JSON', short: '{}', color: '#f472b6', softBg: 'rgba(244,114,182,0.1)' },
  yaml: { id: 'yaml', label: 'YAML', short: 'YM', color: '#f87171', softBg: 'rgba(248,113,113,0.1)' },
  css: { id: 'css', label: 'CSS', short: 'CSS', color: '#60a5fa', softBg: 'rgba(96,165,250,0.1)' },
  html: { id: 'html', label: 'HTML', short: '<>', color: '#fb923c', softBg: 'rgba(251,146,60,0.1)' },
  java: { id: 'java', label: 'Java', short: 'JV', color: '#f87171', softBg: 'rgba(248,113,113,0.1)' },
  c: { id: 'c', label: 'C', short: 'C', color: '#60a5fa', softBg: 'rgba(96,165,250,0.1)' },
  cpp: { id: 'cpp', label: 'C++', short: 'C+', color: '#60a5fa', softBg: 'rgba(96,165,250,0.1)' },
  ruby: { id: 'ruby', label: 'Ruby', short: 'RB', color: '#f87171', softBg: 'rgba(248,113,113,0.1)' },
  php: { id: 'php', label: 'PHP', short: 'PHP', color: '#a78bfa', softBg: 'rgba(167,139,250,0.1)' },
  swift: { id: 'swift', label: 'Swift', short: 'SW', color: '#fb923c', softBg: 'rgba(251,146,60,0.1)' },
  kotlin: { id: 'kotlin', label: 'Kotlin', short: 'KT', color: '#a78bfa', softBg: 'rgba(167,139,250,0.1)' },
  other: { id: 'other', label: 'Other', short: '••', color: '#9ca3af', softBg: 'rgba(156,163,175,0.1)' },
}

/** Every id the UI has curated metadata for, in the order the picker shows them. */
export const LANGUAGE_OPTIONS: LanguageMeta[] = KNOWN_LANGUAGES.map((id) => LANGUAGES[id])

/**
 * Languages whose comments start with `#`. A snippet the user typed in by hand has no
 * entry here, so the comment splitter consults the list rather than testing only the
 * three ids it originally shipped with.
 */
const HASH_COMMENT_LANGUAGES = new Set(['python', 'bash', 'ruby', 'yaml', 'other'])

export function commentsWithHash(lang: Language): boolean {
  return HASH_COMMENT_LANGUAGES.has(lang.toLowerCase())
}

/**
 * Colours for languages the user typed in themselves. Seeded off the id the same way
 * `avatarGradient` is seeded off a user id, so `elixir` is always the same colour
 * without a lookup table entry.
 */
const GENERATED_COLORS = [
  { color: '#22d3ee', softBg: 'rgba(34,211,238,0.1)' },
  { color: '#fbbf24', softBg: 'rgba(251,191,36,0.1)' },
  { color: '#fb923c', softBg: 'rgba(251,146,60,0.1)' },
  { color: '#61dafb', softBg: 'rgba(97,218,251,0.1)' },
  { color: '#a78bfa', softBg: 'rgba(167,139,250,0.1)' },
  { color: '#4ade80', softBg: 'rgba(74,222,128,0.1)' },
  { color: '#f472b6', softBg: 'rgba(244,114,182,0.1)' },
  { color: '#f87171', softBg: 'rgba(248,113,113,0.1)' },
  { color: '#60a5fa', softBg: 'rgba(96,165,250,0.1)' },
]

function hashOf(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return hash
}

/** The id a snippet is stored under, normalised the same way on every path. */
export function normalizeLanguage(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Metadata for any language string, curated or not. An unrecognised id still gets a
 * readable label, a two-letter short form and a stable colour rather than falling back
 * to "Other" — which would make every hand-entered language look like a mistake.
 */
export function languageMeta(lang: Language): LanguageMeta {
  const id = normalizeLanguage(lang)
  const known = LANGUAGES[id as KnownLanguage]
  if (known) return known

  const { color, softBg } = GENERATED_COLORS[hashOf(id) % GENERATED_COLORS.length]
  const label = id ? id[0].toUpperCase() + id.slice(1) : 'Other'
  return {
    id,
    label,
    short: label.slice(0, 2).toUpperCase(),
    color,
    softBg,
  }
}

/** File extension used for the generated "raw" view and default filenames. */
export const EXTENSIONS: Record<KnownLanguage, string> = {
  typescript: 'ts',
  javascript: 'js',
  python: 'py',
  rust: 'rs',
  go: 'go',
  sql: 'sql',
  bash: 'sh',
  json: 'json',
  yaml: 'yml',
  css: 'css',
  html: 'html',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  ruby: 'rb',
  php: 'php',
  swift: 'swift',
  kotlin: 'kt',
  other: 'txt',
}

/** Extensions for a language the user typed in — `elixir` downloads as `elixir.txt`. */
export function extensionFor(lang: Language): string {
  return EXTENSIONS[normalizeLanguage(lang) as KnownLanguage] ?? 'txt'
}

/** Snippets with multi-word titles get a kebab-cased filename. */
export function slugify(title: string): string {
  const base = title
    .trim()
    .replace(/['"`]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  const camel = base.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
  return camel || 'snippet'
}
