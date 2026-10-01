import type { Language } from './types'

export interface LanguageMeta {
  id: Language
  label: string
  short: string
  /** CSS colour used for the language dot / badge */
  color: string
  /** `rgba()` background at 10% opacity, matching the design's badge fills */
  softBg: string
}

export const LANGUAGES: Record<Language, LanguageMeta> = {
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

/** Languages offered in the create-snippet picker, in design order. */
export const CREATE_LANGUAGES: Language[] = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'sql',
]

export function languageMeta(lang: Language): LanguageMeta {
  return LANGUAGES[lang] ?? LANGUAGES.other
}

/** File extension used for the generated "raw" view and default filenames. */
export const EXTENSIONS: Record<Language, string> = {
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