/**
 * The single choke point for every backend call.
 *
 * Two things live here that no component should ever reimplement:
 *
 *  1. **Error normalisation.** The backend returns three different error shapes —
 *     `{detail}` from `HTTPException`, `{detail: 'Validation Error', errors: [...]}` from
 *     the 422 handler, and `{error}` from slowapi's rate limiter. A client that only reads
 *     `detail` renders every 429 as a blank failure.
 *  2. **Token refresh.** One refresh in flight at a time, one replay per request, so a
 *     page firing six parallel fetches does not fire six refreshes.
 */

import type {
  CollectionDto,
  CommentDto,
  CommunityUserDto,
  PageDto,
  SingleDto,
  SnippetDto,
  UserDto,
} from './dto'

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** One field-level message from a 422, keyed by the offending input's field name. */
export type FieldErrors = Record<string, string>

export class ApiError extends Error {
  readonly status: number
  /** Field-level messages, 422 only. Empty for every other status. */
  readonly fields: FieldErrors

  constructor(status: number, message: string, fields: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }

  /** True when the failure is the user's problem, not the server's. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }
}

/**
 * Pulls a human-readable message out of any of the three error shapes.
 *
 * `detail` is only a string for `HTTPException` — on a 422 it is the literal
 * "Validation Error", which is why the `errors` array is checked first.
 */
function normaliseError(status: number, body: unknown): ApiError {
  if (!body || typeof body !== 'object') {
    return new ApiError(status, defaultMessage(status))
  }

  const b = body as { detail?: unknown; error?: unknown; errors?: unknown }

  // slowapi's rate limiter uses `error`, not `detail`.
  if (typeof b.error === 'string') return new ApiError(status, b.error)

  if (Array.isArray(b.errors)) {
    return new ApiError(status, 'Some fields need attention', fieldErrors(b.errors))
  }

  if (typeof b.detail === 'string') {
    // The generic 422 marker is never worth showing as-is.
    const message = b.detail === 'Validation Error' ? 'Some fields need attention' : b.detail
    return new ApiError(status, message)
  }

  return new ApiError(status, defaultMessage(status))
}

function fieldErrors(errors: unknown[]): FieldErrors {
  const out: FieldErrors = {}
  for (const raw of errors) {
    if (!raw || typeof raw !== 'object') continue
    const { loc, msg } = raw as { loc?: unknown; msg?: unknown }
    if (typeof msg !== 'string') continue
    // loc is ['body' | 'query' | 'path', ...field path]; drop the scope segment.
    const field = Array.isArray(loc) ? loc.slice(1).join('.') : ''
    if (field && !out[field]) out[field] = msg
  }
  return out
}

function defaultMessage(status: number): string {
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return "You don't have permission to do that."
  if (status === 404) return "We couldn't find that."
  if (status === 429) return 'Too many requests. Give it a moment and try again.'
  if (status >= 500) return 'Something went wrong on our end. Please try again.'
  return 'Something went wrong.'
}

/** Any thrown value that isn't an `ApiError` still needs a message to show. */
export function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

// ---------------------------------------------------------------------------
// Token store
// ---------------------------------------------------------------------------

const ACCESS_KEY = 'sv.access'
const REFRESH_KEY = 'sv.refresh'

/**
 * Fires when a refresh fails for good and the session is gone. `useAuth` listens for
 * this rather than `api.ts` importing the router, which would be a cycle.
 */
export const SESSION_LOST = 'sv:session-lost'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Private browsing modes can throw on localStorage access.
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — the session just won't survive a reload */
  }
}

export const tokens = {
  get access(): string | null {
    return read(ACCESS_KEY)
  },
  get refresh(): string | null {
    return read(REFRESH_KEY)
  },
  set(access: string, refresh?: string): void {
    write(ACCESS_KEY, access)
    if (refresh) write(REFRESH_KEY, refresh)
  },
  clear(): void {
    write(ACCESS_KEY, null)
    write(REFRESH_KEY, null)
  },
}

// ---------------------------------------------------------------------------
// request
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** Serialised as JSON. Ignored when `form` is set. */
  body?: unknown
  /** Sent as `application/x-www-form-urlencoded` — required by `/auth/login`. */
  form?: Record<string, string>
  /** Attaches the bearer token when one is stored. */
  auth?: boolean
  signal?: AbortSignal
}

/** Shared across concurrent 401s so six parallel calls trigger one refresh. */
let refreshInFlight: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokens.refresh
  if (!refresh) return false

  refreshInFlight ??= (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      })
      if (!res.ok) return false
      const data = (await res.json()) as { access_token?: string }
      if (!data.access_token) return false
      tokens.set(data.access_token)
      return true
    } catch {
      return false
    } finally {
      // Cleared on the next tick so callers awaiting this promise all see the result.
      queueMicrotask(() => {
        refreshInFlight = null
      })
    }
  })()

  return refreshInFlight
}

function endSession(): void {
  tokens.clear()
  window.dispatchEvent(new CustomEvent(SESSION_LOST))
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, form, auth = false, signal } = options

  const headers: Record<string, string> = {}
  if (form) {
    // URLSearchParams sets its own content type, and it must be form-encoded.
    ;(headers as Record<string, string>)['Content-Type'] = 'application/x-www-form-urlencoded'
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (auth) {
    const token = tokens.access
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const payload =
    form !== undefined
      ? new URLSearchParams(form).toString()
      : body !== undefined
        ? JSON.stringify(body)
        : undefined

  const res = await fetch(`/api${path}`, { method, headers, body: payload, signal })

  if (res.ok) {
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  // A 401 on an authenticated call gets exactly one refresh + replay, so a stale
  // token doesn't log the user out mid-session.
  if (res.status === 401 && auth && tokens.refresh) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return request<T>(path, { ...options, auth })
    }
    endSession()
  }

  // A dead or non-JSON body (a proxy error page, an empty 502) still has to land
  // as an ApiError so callers can read `.status`.
  const errorBody = await res.json().catch(() => null)
  throw normaliseError(res.status, errorBody)
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export interface PageQuery {
  page?: number
  limit?: number
  search?: string
  language?: string
  tag?: string
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

/** Every list endpoint wraps its payload; `key` is that envelope key. */
function unwrap<T>(envelope: PageDto<T>, key: keyof PageDto<T>): T[] {
  const items = envelope[key]
  return Array.isArray(items) ? (items as T[]) : []
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  signup(input: { name: string; email: string; password: string }) {
    return request<{ message: string }>('/auth/signup', { method: 'POST', body: input })
  },

  /** Form-encoded: the field named `username` carries the email address. */
  login(email: string, password: string) {
    return request<{
      message: string
      access_token: string
      refresh_token: string
      token_type: string
    }>('/auth/login', { method: 'POST', form: { username: email, password } })
  },

  logout(refreshToken: string) {
    return request<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: { refresh_token: refreshToken },
      auth: true,
    })
  },

  /**
   * Which social sign-ins this server has credentials for. Read once when the auth
   * page mounts; a provider with no client id is left out rather than shown dead.
   */
  oauthProviders() {
    return request<{ message: string; providers: string[] }>('/auth/oauth/providers')
  },

  profile() {
    return request<SingleDto<UserDto>>('/auth/profile', { auth: true })
  },

  updateProfile(input: { name?: string; username?: string; bio?: string; website?: string }) {
    return request<SingleDto<UserDto>>('/auth/profile', { method: 'PATCH', body: input, auth: true })
  },

  changeEmail(email: string) {
    return request<SingleDto<UserDto>>('/auth/email', { method: 'PATCH', body: { email }, auth: true })
  },

  changePassword(input: {
    current_password: string
    new_password: string
    confirm_new_password: string
  }) {
    return request<{ message: string }>('/auth/password', { method: 'PATCH', body: input, auth: true })
  },

  forgotPassword(email: string) {
    return request<{ message: string }>('/auth/password/forgot', {
      method: 'POST',
      body: { email },
    })
  },

  resetPassword(input: { token: string; new_password: string; confirm_new_password: string }) {
    return request<{ message: string }>('/auth/password/reset', { method: 'POST', body: input })
  },

  verifyEmail(token: string) {
    return request<SingleDto<UserDto>>('/auth/email/verify', {
      method: 'POST',
      body: { token },
    })
  },

  resendVerification(email: string) {
    return request<{ message: string }>('/auth/email/resend-unauthenticated', {
      method: 'POST',
      body: { email },
    })
  },

  deleteAccount() {
    return request<{ message: string }>('/auth/account', { method: 'DELETE', auth: true })
  },
}

// ---------------------------------------------------------------------------
// Snippets
// ---------------------------------------------------------------------------

export interface SnippetInput {
  title: string
  description?: string | null
  code: string
  language: string
  is_public: boolean
  tags?: string[]
}

export interface CopyResult {
  message: string
  copy_count: number
}

export const snippetsApi = {
  async mine(params: PageQuery = {}): Promise<Page<SnippetDto>> {
    const res = await request<PageDto<SnippetDto>>(`/snippets${query({ ...params })}`, {
      auth: true,
    })
    return { items: unwrap(res, 'snippets'), total: res.total, hasNext: res.has_next }
  },

  async publicList(params: PageQuery = {}): Promise<Page<SnippetDto>> {
    const res = await request<PageDto<SnippetDto>>(`/snippets/public${query({ ...params })}`)
    return { items: unwrap(res, 'snippets'), total: res.total, hasNext: res.has_next }
  },

  async trending(params: PageQuery = {}): Promise<Page<SnippetDto>> {
    const res = await request<PageDto<SnippetDto>>(`/snippets/trending${query({ ...params })}`)
    return { items: unwrap(res, 'snippets'), total: res.total, hasNext: res.has_next }
  },

  /** Own snippet by id — works for private ones too. 404s for anyone else's. */
  async owned(id: string): Promise<SnippetDto> {
    const res = await request<SingleDto<SnippetDto>>(`/snippets/${id}`, { auth: true })
    return requireField(res.snippet, 'Snippet not found')
  },

  /** Public snippet by id. A private one 404s rather than 403s — by design. */
  async publicOne(id: string): Promise<SnippetDto> {
    const res = await request<SingleDto<SnippetDto>>(`/snippets/public/${id}`)
    return requireField(res.snippet, 'Snippet not found')
  },

  create(input: SnippetInput): Promise<SnippetDto> {
    return request<SingleDto<SnippetDto>>('/snippets', {
      method: 'POST',
      body: input,
      auth: true,
    }).then((res) => requireField(res.snippet, 'Snippet was not returned'))
  },

  update(id: string, input: Partial<SnippetInput>): Promise<SnippetDto> {
    return request<SingleDto<SnippetDto>>(`/snippets/${id}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }).then((res) => requireField(res.snippet, 'Snippet was not returned'))
  },

  remove(id: string) {
    return request<{ message: string }>(`/snippets/${id}`, { method: 'DELETE', auth: true })
  },

  /** Increments the counter server-side. Use the returned count, not your guess. */
  copy(id: string): Promise<CopyResult> {
    return request<CopyResult>(`/snippets/${id}/copy`, { method: 'POST', auth: true })
  },

  /** Explains a snippet you own and persists the result. */
  async explain(id: string): Promise<string> {
    const res = await request<SingleDto<SnippetDto>>(`/snippets/${id}/explain`, {
      method: 'POST',
      auth: true,
    })
    const snippet = requireField(res.snippet, 'Snippet not found')
    return snippet.ai_explanation ?? ''
  },

  async bookmarks(params: PageQuery = {}): Promise<Page<SnippetDto>> {
    const res = await request<PageDto<SnippetDto>>(`/bookmarks${query({ ...params })}`, {
      auth: true,
    })
    return { items: unwrap(res, 'bookmarks'), total: res.total, hasNext: res.has_next }
  },

  /** 409 means it was already bookmarked — same outcome, so the caller treats both as success. */
  async bookmark(id: string): Promise<boolean> {
    try {
      await request<{ message: string; bookmark_id: string }>(`/snippets/${id}/bookmark`, {
        method: 'POST',
        auth: true,
      })
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) return true
      throw error
    }
  },

  async unbookmark(id: string): Promise<boolean> {
    try {
      await request<{ message: string; bookmark_id: string }>(`/snippets/${id}/bookmark`, {
        method: 'DELETE',
        auth: true,
      })
      return false
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return false
      throw error
    }
  },
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export interface CollectionInput {
  name: string
  description?: string | null
}

export const collectionsApi = {
  async list(params: PageQuery = {}): Promise<Page<CollectionDto>> {
    const res = await request<PageDto<CollectionDto>>(`/collections${query({ ...params })}`, {
      auth: true,
    })
    return { items: unwrap(res, 'collections'), total: res.total, hasNext: res.has_next }
  },

  async get(id: string): Promise<CollectionDto> {
    const res = await request<SingleDto<CollectionDto>>(`/collections/${id}`, { auth: true })
    return requireField(res.collection, 'Collection not found')
  },

  /** Members. Your own snippets come back public or not. */
  async snippets(id: string, params: PageQuery = {}): Promise<Page<SnippetDto>> {
    const res = await request<PageDto<SnippetDto>>(
      `/collections/${id}/snippets${query({ ...params })}`,
      { auth: true },
    )
    return { items: unwrap(res, 'snippets'), total: res.total, hasNext: res.has_next }
  },

  create(input: CollectionInput): Promise<CollectionDto> {
    return request<SingleDto<CollectionDto>>('/collections', {
      method: 'POST',
      body: input,
      auth: true,
    }).then((res) => requireField(res.collection, 'Collection was not returned'))
  },

  update(id: string, input: Partial<CollectionInput>): Promise<CollectionDto> {
    return request<SingleDto<CollectionDto>>(`/collections/${id}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }).then((res) => requireField(res.collection, 'Collection was not returned'))
  },

  remove(id: string) {
    return request<{ message: string }>(`/collections/${id}`, { method: 'DELETE', auth: true })
  },

  addSnippet(collectionId: string, snippetId: string): Promise<CollectionDto> {
    return request<SingleDto<CollectionDto>>(`/collections/${collectionId}/snippets`, {
      method: 'POST',
      body: { snippet_id: snippetId },
      auth: true,
    }).then((res) => requireField(res.collection, 'Collection was not returned'))
  },

  removeSnippet(collectionId: string, snippetId: string) {
    return request<{ message: string }>(`/collections/${collectionId}/snippets/${snippetId}`, {
      method: 'DELETE',
      auth: true,
    })
  },
}

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

export const communityApi = {
  async users(params: PageQuery = {}): Promise<Page<CommunityUserDto>> {
    const res = await request<PageDto<CommunityUserDto>>(
      `/community/users${query({ ...params })}`,
    )
    return { items: unwrap(res, 'users'), total: res.total, hasNext: res.has_next }
  },

  async user(userId: string): Promise<CommunityUserDto> {
    const res = await request<SingleDto<CommunityUserDto>>(`/community/users/${userId}`)
    return requireField(res.user, 'User not found')
  },

  async userSnippets(userId: string, params: PageQuery = {}): Promise<Page<SnippetDto>> {
    const res = await request<PageDto<SnippetDto>>(
      `/community/users/${userId}/snippets${query({ ...params })}`,
    )
    return { items: unwrap(res, 'snippets'), total: res.total, hasNext: res.has_next }
  },
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export const commentsApi = {
  async list(snippetId: string, params: PageQuery = {}): Promise<Page<CommentDto>> {
    const res = await request<PageDto<CommentDto>>(
      `/snippets/${snippetId}/comments${query({ ...params })}`,
    )
    return { items: unwrap(res, 'comments'), total: res.total, hasNext: res.has_next }
  },

  async create(snippetId: string, body: string): Promise<CommentDto> {
    const res = await request<SingleDto<CommentDto>>(`/snippets/${snippetId}/comments`, {
      method: 'POST',
      body: { body },
      auth: true,
    })
    return requireField(res.comment, 'Comment was not returned')
  },

  remove(commentId: string) {
    return request<{ message: string }>(`/comments/${commentId}`, { method: 'DELETE', auth: true })
  },
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export const aiApi = {
  /** Live explanation of arbitrary code. Nothing is persisted. 502 if the model fails. */
  explain(input: { code: string; language?: string; title?: string }) {
    return request<{ message: string; explanation: string }>('/ai/explain', {
      method: 'POST',
      body: input,
      auth: true,
    })
  },

  suggestTitle(input: { code: string; language?: string }) {
    return request<{ message: string; title: string }>('/ai/generate-title', {
      method: 'POST',
      body: input,
      auth: true,
    })
  },
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface Health {
  status: string
  message: string
  db_status: string
  server_uptime: number
}

export const healthApi = {
  check() {
    return request<Health>('/health')
  },
}

// ---------------------------------------------------------------------------
// Shared page shape
// ---------------------------------------------------------------------------

export interface Page<T> {
  items: T[]
  total: number
  hasNext: boolean
}

/**
 * A single-entity response that came back without its payload is a backend bug, not
 * an empty state — surfacing it as a thrown error beats rendering `undefined`.
 */
function requireField<T>(value: T | undefined, message: string): T {
  if (value === undefined || value === null) throw new ApiError(500, message)
  return value
}