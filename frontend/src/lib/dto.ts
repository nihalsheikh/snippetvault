/**
 * Raw backend response shapes. These mirror the Pydantic schemas in
 * `backend/schemas/*_req_res.py` exactly — snake_case, nullable fields marked.
 * Nothing outside `mappers.ts` should reference these.
 */

export interface TagDto {
  id: string
  name: string
  slug: string
}

export interface SnippetDto {
  id: string
  title: string
  description: string | null
  code: string
  language: string
  is_public: boolean
  copy_count: number
  ai_explanation: string | null
  author_id: string
  created_at: string
  updated_at: string
  tags: TagDto[]
}

export interface CollectionDto {
  id: string
  name: string
  description: string | null
  user_id: string
  created_at: string
  updated_at: string
}

/** `UserDetails` carries no `created_at` — a member since date has to come from elsewhere. */
export interface UserDto {
  id: string
  name: string | null
  email: string
  email_verified: boolean
  email_verified_at: string | null
  profile_image: string | null
  username: string | null
  bio: string | null
  website: string | null
}

export interface CommunityUserDto {
  id: string
  name: string | null
  username: string | null
  bio: string | null
  created_at: string
}

export interface CommentAuthorDto {
  id: string
  name: string | null
  username: string | null
}

export interface CommentDto {
  id: string
  body: string
  user_id: string
  snippet_id: string
  created_at: string
  author: CommentAuthorDto
}

/** Every list endpoint wraps its payload in this shape. */
export interface PageDto<T> {
  message: string
  page: number
  limit: number
  total: number
  has_next: boolean
  snippets?: T[]
  bookmarks?: T[]
  collections?: T[]
  users?: T[]
  comments?: T[]
}

export interface SingleDto<T> {
  message: string
  snippet?: T
  collection?: T
  comment?: T
  user?: T
}