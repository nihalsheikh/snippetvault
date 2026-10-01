/**
 * Backend → frontend mapping. Every DTO crosses into `types.ts` shape here and nowhere
 * else, so no component ever sees `copy_count` or a `null` where it expects a string.
 *
 * The coercion rules (`?? ''`, `?? undefined`) are deliberate: the backend types many
 * fields nullable and `types.ts` types them non-nullable. Widening every domain type
 * would ripple a guard through every render site; coercing here keeps that in one file.
 */

import type { CollectionDto, CommentDto, CommunityUserDto, SnippetDto, UserDto } from './dto'
import { avatarGradient, initialsOf, usernameOf } from './format'
import { normalizeLanguage } from './languages'
import type { Author, Collection, Comment, Profile, Snippet, Visibility } from './types'

/**
 * Authors are joined client-side: `SnippetDetails` carries only `author_id`, so the
 * display name comes from a `/api/community/users` cache the caller maintains.
 */
export function toAuthor(
  d: {
    id: string
    name?: string | null
    username?: string | null
    email?: string
    profile_image?: string | null
  },
  known?: Author,
): Author {
  if (known) return known
  const handle = usernameOf({ username: d.username ?? null, email: d.email ?? d.id })
  const name = d.name || handle
  return {
    id: d.id,
    name,
    username: handle,
    // Accounts created without a display name still get readable initials from their
    // handle, rather than the '?' the previous fallback produced.
    initials: initialsOf(name) || '?',
    avatarGradient: avatarGradient(d.id),
    profileImage: d.profile_image ?? null,
  }
}

/** One snippet. `authors` is the community roster lookup, when the page has one. */
export function toSnippet(d: SnippetDto, authors?: Map<string, Author>): Snippet {
  const authorId = d.author_id
  const known = authors?.get(authorId)
  const author: Author = known ?? {
    id: authorId,
    name: 'Anonymous',
    // No username in the payload — an id prefix keeps the @handle readable and unique.
    username: authorId.slice(0, 8),
    initials: '?',
    avatarGradient: avatarGradient(authorId),
  }

  return {
    id: d.id,
    title: d.title,
    description: d.description ?? '',
    code: d.code,
    // Stored as a free string, so a language the user typed in passes through as-is;
    // `languageMeta` supplies the label and colour for ids it doesn't know.
    language: normalizeLanguage(d.language),
    tags: d.tags.map((tag) => tag.name),
    visibility: (d.is_public ? 'public' : 'private') as Visibility,
    author,
    authorId,
    copies: d.copy_count,
    aiExplanation: d.ai_explanation ?? undefined,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }
}

/**
 * Maps a whole page. This exists so `toSnippet`'s second parameter can't be
 * accidentally filled by `Array.map`, which passes the element index there.
 */
export function toSnippets(list: SnippetDto[], authors?: Map<string, Author>): Snippet[] {
  return list.map((d) => toSnippet(d, authors))
}

export function toCollection(d: CollectionDto): Collection {
  return {
    id: d.id,
    name: d.name,
    description: d.description ?? '',
    userId: d.user_id,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }
}

export function toComment(d: CommentDto): Comment {
  return {
    id: d.id,
    author: toAuthor(d.author),
    body: d.body,
    createdAt: d.created_at,
  }
}

/** Community roster rows — the design shows name + handle + join date. */
export function toCommunityUser(d: CommunityUserDto): Author & { bio: string; createdAt: string } {
  return {
    ...toAuthor(d),
    bio: d.bio ?? '',
    createdAt: d.created_at,
  }
}

export function toProfile(d: UserDto): Profile {
  const handle = usernameOf({ username: d.username, email: d.email })
  return {
    id: d.id,
    name: d.name || handle,
    username: handle,
    email: d.email,
    bio: d.bio ?? '',
    website: d.website ?? '',
    profileImage: d.profile_image,
    emailVerified: d.email_verified,
  }
}

/**
 * Builds the id → Author lookup that `toSnippet` needs. `community/users` returns
 * every author in one call, so one fetch covers a whole page of snippets.
 */
export function authorMap(users: CommunityUserDto[]): Map<string, Author> {
  const map = new Map<string, Author>()
  for (const user of users) map.set(user.id, toAuthor(user))
  return map
}