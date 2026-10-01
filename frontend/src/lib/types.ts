/**
 * A snippet's language.
 *
 * The backend stores a free string (`models/snippets_model.py` — `Column(String)`,
 * validated only as 1–50 chars), and the create screen lets the user type any
 * language they want, so this is deliberately not a closed union. The ids below are
 * the ones the UI has colours, extensions and keyword highlighting for; anything else
 * still renders, just with generated metadata — see `languageMeta` in
 * `lib/languages.ts`.
 */
export type Language = string

export const KNOWN_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'sql',
  'bash',
  'json',
  'yaml',
  'css',
  'html',
  'java',
  'c',
  'cpp',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'other',
] as const

export type KnownLanguage = (typeof KNOWN_LANGUAGES)[number]

export type Visibility = 'public' | 'private'

export interface Author {
  id: string
  name: string
  username: string
  initials: string
  avatarGradient?: string
  /** Set when the user uploaded one; nothing exposes an upload endpoint yet. */
  profileImage?: string | null
}

export interface Snippet {
  id: string
  title: string
  description: string
  code: string
  language: Language
  tags: string[]
  visibility: Visibility
  author: Author
  /** The backend's `author_id` — the join key for the community roster. */
  authorId: string
  copies: number
  aiExplanation?: string
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  author: Author
  body: string
  createdAt: string
}

export interface Collection {
  id: string
  name: string
  description: string
  userId: string
  createdAt: string
  updatedAt: string
}

/** The signed-in account. `UserDetails` exposes no join date, so there isn't one here. */
export interface Profile {
  id: string
  name: string
  username: string
  email: string
  bio: string
  website: string
  profileImage: string | null
  emailVerified: boolean
}