# SnippetVault — API Guide

Contract reference for wiring the React frontend to the FastAPI backend.
Every status code and field name below was read off the router, schema and model code.

---

## 0. Changelog

Changes applied to the backend while writing this guide. **Re-verify against `/docs`
after restarting the server** — several of these change the wire format.

### Bug fixes

| Fix | Effect |
| --- | --- |
| Collections router gained `prefix="/api"` | `/collections…` → `/api/collections…`. Was **completely unreachable** through the Vite proxy. |
| `422` handler used `HTTP_422_UNPROCESSABLE_CONTENT` | That constant is a `MagicMock`, not an int. Starlette's `JSONResponse` does `self.status_code < 400` → **TypeError on every validation error**. All 422s now work. |
| `remove_bookmark` read `bookmark.id` after `db.delete()` | Post-flush the instance is expunged; the 200 response **500'd**. Id is now captured first. |
| `.env.example` realigned to `env_config.py` | It listed `SECRET_KEY` / `ALGORITHM` / `ACCESS_TOKEN_EXPIRE_DAYS` / `GEMINI_API_KEY`, none of which are read. Copying it verbatim crashes the app. |

### New endpoints

| Route | Notes |
| --- | --- |
| `POST /api/ai/explain` 🔒 | Ad-hoc explanation, nothing persisted. Rate-limited 10/min. |
| `POST /api/ai/generate-title` 🔒 | Suggests a title for untitled code. |
| `POST /api/snippets/{id}/explain` 🔒 | Explains an owned snippet and **persists** it to `ai_explanation`. |
| `GET /api/snippets/trending` | Ranked by `copy_count` desc. |
| `POST /api/auth/password/forgot` | Sends a reset link. Non-enumerable. |
| `POST /api/auth/email/resend-unauthenticated` | Reissues a signup link without requiring login. |
| `GET /api/collections/{id}/snippets` | Lists a collection's members. |
| `GET /api/snippets/{id}/comments` | Comment thread for a public snippet. |
| `POST /api/snippets/{id}/comments` | Post a comment. Rate-limited 5/min. |
| `DELETE /api/comments/{id}` | Author-only delete. |

### Changed responses (additive)

`page` / `limit` / `total` / `has_next` added to `GET /api/snippets/public`,
`GET /api/snippets`, `GET /api/bookmarks`, `GET /api/collections`.
Purely additive — existing clients unaffected.

`name: str | None` added to `CommunityUserDetails`. The `users.name` column always
existed; the schema just wasn't exposing it. Display names on `CommunityPage` and in
snippet bylines now have a source.

### Security

`POST /api/snippets/{id}/copy` now **requires auth**. Previously any anonymous caller
could inflate any public snippet's counter.

### Known-good contract, unchanged

- Login is form-encoded, field `username` holds the **email**.
- `POST /api/auth/signup` returns no tokens — verify email before login.
- Verification tokens expire in **10 minutes**, reset tokens **30 minutes**, both single use.

### Still missing (not built)

- **Likes / favourites** — `favourited` in `types.ts` has no backing field. The sidebar's
  "Saved" section uses `/api/bookmarks` instead.
- **OAuth login** — `OAuthAccount` model + `OAuthProvider` enum exist, no routes. The
  GitHub/Google buttons on `AuthPage` have nothing to call.
- **Dashboard stats endpoint** — derive from `GET /api/snippets` (`total` now makes this cheap).
- **Language list / counts** — derive from the `language` values you receive.
- **Per-week activity** — nothing records it, so "↑ N this week" has no data source.

---

## 1. Connection

| | |
| --- | --- |
| Backend base | `http://localhost:8000` |
| Frontend | `http://localhost:5173` |
| Interactive docs | `http://localhost:8000/docs` |
| Auth scheme | `Authorization: Bearer <access_token>` |

`frontend/vite.config.ts` already proxies **`/api` → `http://localhost:8000`**.

```ts
// always relative — never hardcode localhost
await fetch('/api/snippets/public')
```

Every route is under `/api`, including collections. ✅ *(Fixed: the collections router
was missing its `prefix="/api"`.)*

---

## 2. Response conventions

Every endpoint returns a `message` field alongside its data.

### Success

```jsonc
// single entity
{ "message": "Fetched snippet details", "snippet": { /* … */ } }

// list — note: envelope key varies, see §9
{ "message": "Fetched all public snippets", "snippets": [ /* … */ ] }
```

### Errors

All errors are `{"detail": "..."}` — **except** rate limiting (§2c) and 422 (§2b).

#### 2a. `HTTPException`

```json
{ "detail": "Snippet not found" }
```

Thrown by `middleware/exception_handler.py`. `detail` is always a **string**.

#### 2b. `422` validation — different shape

`validation_exception_handler` adds a second key:

```jsonc
{
  "detail": "Validation Error",
  "errors": [
    { "loc": ["body", "email"], "msg": "value is not a valid email address", "type": "value_error" }
  ]
}
```

`errors[].loc[0]` tells you where (`body` | `query` | `path`), the rest is the field path.
`detail` is a generic string here — **never** show it to the user; map `errors` instead.

#### 2c. `429` rate limited — key is `error`, not `detail`

slowapi's built-in handler, not yours:

```json
{ "error": "Rate limit exceeded: 20 per 1 minute" }
```

⚠️ **This breaks any client that reads `detail`.** Normalise in one place:

```ts
function errorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Something went wrong'
  const b = body as { detail?: unknown; error?: unknown }
  if (typeof b.error === 'string') return b.error            // 429
  if (typeof b.detail === 'string') return b.detail          // everything else
  return 'Validation Error'                                   // 422
}
```

#### 2d. `500`

`global_exception_handler` swallows everything into `{ "detail": "Internal server error" }`.
Log nothing on the client; this is a backend bug.

### Rate limits

Keyed by IP (`get_remote_address`). ⚠️ **Through the Vite proxy every request
appears to come from one IP**, so in dev you will hit these far sooner than in production.

| Route | Limit |
| --- | --- |
| `POST /api/snippets` | 20/min |
| `PATCH /api/snippets/{id}` | 30/min |
| `POST /api/snippets/{id}/copy` | 30/min |
| `POST /api/snippets/{id}/bookmark` | 30/min |
| `PATCH /api/auth/password` | 30/min |
| `POST /api/auth/email/resend` | 30/min |
| `POST /collections` | 10/min |
| `PATCH /collections/{id}` | 30/min |
| `POST /collections/{id}/snippets` | 30/min |
| `DELETE /collections/{id}` | 20/min |

### CORS

`allow_origins=[env_settings.frontend_url]`. If you deploy, set `FRONTEND_URL` to your
deployed origin or every browser call is blocked. `allow_credentials=True`, so do **not**
put tokens in cookies unless you also handle `SameSite` + CSRF.

---

## 3. Auth

### `POST /api/auth/signup` → `201`

```jsonc
// request
{ "name": "Nihal Sheikh", "email": "you@example.com", "password": "••••••••" }
// constraints: name 1-50, password 6-128, valid email

// response  { "message": "Account created successfully. Please verify your email." }
```

⚠️ Returns **no tokens and no user object**. The account is unusable until the email is
verified — login returns `403 "Please verify your email first"`.

The verification email is sent via a `BackgroundTask`, so it fires *after* the 201.

⚠️ Password rule mismatch: the backend only enforces `min_length=6`. The signup form
hints "min. 8 characters / uppercase, number, special character". Either the UI is
stricter than the server (fine) or someone should tighten the server to match.

### `GET /api/auth/email/verify` — see §4

### `POST /api/auth/login` → `200` ⚠️ form-encoded

Uses `OAuth2PasswordRequestForm`. **This is not JSON** — send
`application/x-www-form-urlencoded`. Sending a JSON body yields `422`.

```ts
const body = new URLSearchParams({ username: email, password })
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body,                                   // URLSearchParams sets the header itself
})
```

⚠️ The field is **`username`**, but the backend reads it as `form_data.username` and
compares it to `User.email` — so send your **email address** in the `username` field.

```jsonc
{
  "message": "Login Successful",
  "access_token": "eyJhbGci…",
  "refresh_token": "b3f1c9…",
  "token_type": "bearer"
}
```

| Status | `detail` | Meaning |
| --- | --- | --- |
| `400` | `Invalid email or password` | wrong creds |
| `403` | `Please verify your email first` | signup not completed |
| `422` | — | missing/malformed form fields |

Store `refresh_token` somewhere durable — it is **not** rotated on refresh, and there is
no other way to obtain one.

### `POST /api/auth/refresh` → `200`

```jsonc
// { "refresh_token": "b3f1c9…" }
// → { "message": "Login Successful", "access_token": "eyJ…", "token_type": "bearer" }
```

No new refresh token is returned — keep using the existing one. Errors: `401`
invalid/revoked, `401` expired.

### `POST /api/auth/logout` → `200`

```jsonc
// { "refresh_token": "b3f1c9…" }  →  { "message": "Logout successful" }
```
Sets `revoked = true`. `401` if unknown.

### `GET /api/auth/profile` → `200` 🔒

```jsonc
{ "message": "Fetched user profile details", "user": { /* UserDetails */ } }
```

### `PATCH /api/auth/profile` → `200` 🔒

All fields optional; **only provided ones are applied** (`exclude_unset`).
Cannot change `email` here.

```jsonc
// { "name": "…", "username": "…", "bio": "…", "website": "…" }   // bio ≤500, website ≤255, username 3-30
```
`409 "Username already exists"` on collision.

### `PATCH /api/auth/email` → `200` 🔒

```jsonc
// { "email": "new@example.com" }
// → { "message": "Verification email sent. Please verify your new email address.", "user": {…} }
```

⚠️ **The returned `user` still has the old email** — the change is not applied until the
verification link is opened (`purpose: "email_change"`).

Errors: `409` same email, `403` current email unverified, `409` email taken.

### `POST /api/auth/email/resend` → `200` 🔒

Authenticated variant. Invalidates all unused tokens, issues a fresh one (10 min).
`409` if already verified.

### `POST /api/auth/email/resend-unauthenticated` → `200`

```jsonc
// { "email": "you@example.com" }
// → { "message": "Verification email sent successfully" }
```

Rate-limited **5/min**. Use this from the "verify your email" screen — the
authenticated variant above is useless there, since an unverified account can't sign in.

⚠️ Same non-enumeration rule as `/auth/password/forgot`: 200 and the same body even when
no unverified account exists for the address. It only reissues when the address belongs
to an account with `email_verified = false`.

### `PATCH /api/auth/password` → `200` 🔒

```jsonc
// { "current_password": "…", "new_password": "…", "confirm_new_password": "…" }
// → { "message": "Password changed successfully" }
```
✅ The server **does** check that the two new passwords match — `400 "New Passwords do
not match"` if they differ. Worth confirming client-side too, but it is enforced.
`400` also if the current password is wrong.

### `POST /api/auth/password/forgot` → `200`

```jsonc
// { "email": "you@example.com" }
// → { "message": "Password reset email sent successfully" }
```

Rate-limited **5/min**. Sends a link to `{FRONTEND_URL}/reset-password?token=…`,
valid **30 minutes**. Any outstanding reset links are invalidated first.

⚠️ **Returns 200 with the identical body whether or not the account exists** — this is
deliberate, so the endpoint can't be used to discover registered addresses. Don't
"improve" it by adding an error branch; the UI must show the same confirmation either way.

⚠️ Needs a `/reset-password` frontend route (see §11).

### `POST /api/auth/password/reset` → `200`

```jsonc
// { "token": "…", "new_password": "…", "confirm_new_password": "…" }
// → { "message": "Password reset successfully" }
```

Errors: `404` invalid, `409` used, `410` expired, `400` password mismatch.

### `DELETE /api/auth/account` → `200` 🔒

```jsonc
{ "message": "Account deleted successfully" }
```
Cascades — snippets, collections, bookmarks, tokens all go with it.

---

## 4. Email verification

Verification links are built as:

```py
f"{env_settings.frontend_url.rstrip('/')}/verify-email?token={raw_token}"
```

→ **`/verify-email?token=…`**, which `VerifyEmailPage` already handles. Tokens expire in
**10 minutes** and are single-use.

### `POST /api/auth/email/verify` → `200`

```jsonc
// { "token": "mOQrxmI…" }
// → { "message": "Email verified successfully", "user": { … UserDetails … } }
```

⚠️ Handle these distinctly — they are genuinely different user situations:

| Status | `detail` | Show |
| --- | --- | --- |
| `404` | `Invalid verification token` | link is wrong/unrecognised |
| `409` | `Verification token has already been used` | already fine → send to login |
| `410` | `Verification token has expired` | request a new link |
| `404` | `User not found` | account gone |

⚠️ **StrictMode guard is required.** React double-invokes effects in dev; the endpoint
consumes the token on first call, so the second returns `409` and would overwrite a real
success with an error. `VerifyEmailPage` guards with a ref — keep it.

---

## 5. Snippets

🔒 = `Authorization: Bearer` required.

### `GET /api/snippets/public` → `200`

Query: `page` (1), `limit` (10), `language`, `tag`, `search`.
`search` is `ILIKE` across title, description **and code**.

```jsonc
{
  "message": "Fetched all public snippets",
  "snippets": [ /* SnippetDetails[] */ ],
  "page": 1, "limit": 10, "total": 128, "has_next": true
}
```

### `GET /api/snippets/public/{id}` → `200`

```jsonc
{ "message": "Fetched snippet details", "snippet": { /* SnippetDetails */ } }
```
`404 "Snippet not found"` if missing **or private** (the filter requires `is_public`).
A private snippet is indistinguishable from a missing one — good.

### `GET /api/snippets/trending` → `200`

Public snippets ordered by `copy_count` desc, `created_at` desc as tiebreak.
Query: `page`, `limit`, `language`. Same envelope as `/api/snippets/public`.

```jsonc
{
  "message": "Fetched trending snippets",
  "snippets": [ /* SnippetDetails[] */ ],
  "page": 1, "limit": 10, "total": 128, "has_next": true
}
```

### `GET /api/snippets` → `200` 🔒

The signed-in user's own snippets, **public and private**. Same query params, same
envelope key and pagination block.

### `GET /api/snippets/{id}` → `200` 🔒

Own snippet by id, public or private. `404` if missing **or not yours** — ownership is
enforced in the query, so another user's snippet also 404s rather than 403.

### `POST /api/snippets` → `201` 🔒

```jsonc
// { "title": "…", "description": "…|null", "code": "…",
//   "language": "typescript", "is_public": true, "tags": ["hooks", "react"] }
// → { "message": "Snippet created successfully", "snippet": { /* SnippetDetails */ } }
```

Tags are normalised server-side: trimmed, lowercased, deduped by name, auto-created.
Their `slug` is the name with spaces → hyphens. **Do not pre-normalise on the client**
or you'll display different casing than the server stores.

### `PATCH /api/snippets/{id}` → `200` 🔒

Same fields, all optional. ⚠️ `tags` **replaces** the whole set when present —
`snippet.tags.clear()` then re-add. Omit the key to leave tags untouched.

### `DELETE /api/snippets/{id}` → `200` 🔒

`{ "message": "Snippet deleted successfully" }` · `404` if not found/not yours.

### `POST /api/snippets/{id}/copy` → `200` 🔒 *(token optional in practice)*

```jsonc
{ "message": "Snippet copied successfully", "copy_count": 1205 }
```

⚠️ The handler **ignores the auth dependency** — any caller increments `copy_count` on
any public snippet. Call it from the Copy button, then update the UI with the returned
count rather than optimistically incrementing. It's a counter, not a copy operation:
nothing is duplicated and no bookmark is made.

### `POST /api/snippets/{id}/bookmark` → `201` 🔒

```jsonc
{ "message": "Snippet bookmarked successfully", "bookmark_id": "0193…" }
```
`409 "Snippet already bookmarked"` → show the bookmark as already-active, don't error.

### `DELETE /api/snippets/{id}/bookmark` → `200` 🔒

Returns `bookmark_id` **after** deletion (the ORM object is gone from the session).
Harmless, but don't rely on it. `404 "Bookmark not found"`.

### `GET /api/bookmarks` → `200` 🔒

```jsonc
{
  "message": "Fetched all user bookmarks",
  "bookmarks": [ /* SnippetDetails[] */ ],
  "page": 1, "limit": 10, "total": 7, "has_next": false
}
```

⚠️ Envelope key is **`bookmarks`**, not `snippets`, but the items are full
`SnippetDetails`. Easy to miss when writing a shared list renderer.

---

## 5b. AI

All three are rate-limited to **10/min** and return **`502`** if the model call fails.

### `POST /api/ai/explain` → `200` 🔒

Explains arbitrary code. Nothing is persisted.

```jsonc
// { "code": "def f(): …", "language": "python", "title": "optional" }
// → { "message": "Snippet explained successfully", "explanation": "Plain prose…" }
```

`language` and `title` are both optional. Empty `code` → `422`.

⚠️ Model failures surface as `502` with `detail: "AI explanation unavailable: …"`.
Show a retry, not a validation error.

### `POST /api/ai/generate-title` → `200` 🔒

```jsonc
// { "code": "…", "language": "python" }
// → { "message": "Title generated successfully", "title": "Debounce hook" }
```

### `POST /api/snippets/{id}/explain` → `200` 🔒

Explains a snippet **you own** and writes the result to `ai_explanation`, so it
survives a reload and shows up on the detail page.

```jsonc
// no body
// → { "message": "Snippet explained successfully", "snippet": { …SnippetDetails… } }
```

`404` if not found or not yours. `502` if the model fails.

Code is truncated to 12,000 characters on a line boundary before it reaches the
model, and the prompt says so when it happens.

**Which to use:** this one for the "Explain with AI" button on `NewSnippetPage` /
`SnippetDetailPage` — it persists, so the explanation is there on reload. Use
`/api/ai/explain` for a live preview while typing.

---

### `GET /api/community/users` → `200`

```jsonc
{
  "message": "Fetched community users",
  "users": [ {
    "id": "…",
    "name": "…|null",
    "username": "…|null",
    "bio": "…|null",
    "created_at": "…"
  } ],
  "page": 1, "limit": 10, "total": 128, "has_next": true
}
```

⚠️ `CommunityUserDetails` still has **no `email`, no `profile_image`, no
`avatar_gradient`** — only `id`, `name`, `username`, `bio`, `created_at`. Render a fallback
avatar from the name, username or id; both `name` and `username` are nullable.

⚠️ **No search parameter.** `page` and `limit` are the only query params. Use this as a
client-side roster to resolve `author_id` → display name everywhere else — `SnippetDetails`
carries only the id.

### `GET /api/community/users/{user_id}` → `200`

`{ "message": "Fetched community user profile", "user": { …CommunityUserDetails… } }`

### `GET /api/community/users/{user_id}/snippets` → `200`

Public snippets only. Same filters and the same full pagination block as
`/community/users`.

```jsonc
{ "message": "…", "snippets": [ … ], "page": 1, "limit": 10, "total": 42, "has_next": false }
```

---

## 6b. Comments

| Method | Path | Auth | Status |
| --- | --- | --- | --- |
| `GET` | `/api/snippets/{snippet_id}/comments` | — | `200` |
| `POST` | `/api/snippets/{snippet_id}/comments` | 🔒 | `201` |
| `DELETE` | `/api/comments/{comment_id}` | 🔒 | `200` |

### `GET /api/snippets/{snippet_id}/comments` → `200`

Readable by anyone. Only **public** snippets have a visible thread — a `404` here on your
own private snippet is expected, not a bug.

```jsonc
{
  "message": "Fetched comments",
  "comments": [ {
    "id": "…",
    "body": "Nice — the cleanup function is the part I always forget.",
    "user_id": "…",
    "snippet_id": "…",
    "created_at": "…",
    "author": { "id": "…", "name": "…|null", "username": "…|null" }
  } ],
  "page": 1, "limit": 50, "total": 3, "has_next": false
}
```

✅ `author` is **nested**, unlike `SnippetDetails` which only carries `author_id`. This is
the one place a comment's display name arrives without a second lookup — merge these into
your community roster to resolve bylines on the snippet cards.

### `POST /api/snippets/{snippet_id}/comments` → `201` 🔒

```jsonc
// { "body": "…" }        // 1–2000 chars, required
// → { "message": "Comment created successfully", "comment": { …CommentDetails… } }
```

Rate-limited **5/min**. `404` if the snippet doesn't exist or is private.

### `DELETE /api/comments/{comment_id}` → `200` 🔒

```jsonc
{ "message": "Comment deleted successfully" }
```

Author-only. Anyone else gets `404` — not `403`, so the endpoint doesn't confirm that
someone else's comment exists. Nothing rate-limited.

### Data model

`comments` table, `uuid7` PK, `user_id` and `snippet_id` FKs both `ON DELETE CASCADE` —
deleting an account or a snippet takes its comments with it. There is **no `updated_at`**
and **no nesting**: a comment can't reply to a comment.

---

## 7. Collections

| Method | Path | Auth | Status |
| --- | --- | --- | --- |
| `POST` | `/api/collections` | 🔒 | `201` |
| `GET` | `/api/collections` | 🔒 | `200` |
| `GET` | `/api/collections/{id}` | 🔒 | `200` |
| `GET` | `/api/collections/{id}/snippets` | 🔒 | `200` |
| `PATCH` | `/api/collections/{id}` | 🔒 | `200` |
| `DELETE` | `/api/collections/{id}` | 🔒 | `200` |
| `POST` | `/api/collections/{id}/snippets` | 🔒 | `201` |
| `DELETE` | `/api/collections/{id}/snippets/{snippet_id}` | 🔒 | `200` |

Bodies:

```jsonc
// create / update
{ "name": "React Hooks", "description": "…|null" }   // name 1-100

// add snippet
{ "snippet_id": "0193…" }
```

All return `{ "message": …, "collection": { …CollectionDetails… } }` (deletes return
just `message`).

```jsonc
// CollectionDetails
{ "id": "…", "name": "…", "description": "…|null",
  "user_id": "…", "created_at": "…", "updated_at": "…" }
```

`GET /api/collections/{id}/snippets` returns the members:

```jsonc
{
  "message": "Fetched collection snippets",
  "snippets": [ /* SnippetDetails[] */ ],
  "page": 1, "limit": 10, "total": 4, "has_next": false
}
```

✅ *(Added — this endpoint did not exist, so there was no way to show a collection's
contents. Your own snippets are always returned, public or not.)*

Errors: `404 "Collection not found"`, `409 "Snippet already exists in this collection"`,
`404 "Snippet not found"`.

---

## 8. Health

### `GET /api/health` → `200`

```jsonc
{ "status": "OK", "message": "API is healthy",
  "db_status": "Connected", "server_uptime": 3600 }
```

`server_uptime` is **seconds** (int). `db_status` is the string `"Connected"` or
`"Disconnected"` — note `status` stays `"OK"` even when the DB is down, so check
`db_status` for a real health signal. Good target for the footer's live status dot.

---

## 9. Envelope key reference

| Endpoint | List key |
| --- | --- |
| `/api/snippets/public` | `snippets` |
| `/api/snippets` | `snippets` |
| `/api/bookmarks` | **`bookmarks`** |
| `/api/community/users` | `users` |
| `/api/community/users/{id}/snippets` | `snippets` |
| `/api/collections/{id}/snippets` | `snippets` |
| `/api/collections` | `collections` |
| `/api/snippets/{id}/comments` | `comments` |

Single-entity endpoints return `snippet`, `user`, `collection`, or `comment`.

### Pagination coverage

✅ **Every list endpoint now returns `page`, `limit`, `total` and `has_next`.**

```ts
const next = res.has_next ? `?page=${res.page + 1}` : null
```

---

## 10. Field naming — ⚠️ snake_case

The API returns **snake_case**. The frontend `types.ts` is **camelCase**. A direct
`res.json()` assignment will silently produce `undefined` everywhere.

| Backend | Frontend `types.ts` |
| --- | --- |
| `copy_count` | `copies` |
| `is_public: boolean` | `visibility: 'public' \| 'private'` |
| `created_at` / `updated_at` | `createdAt` / `updatedAt` |
| `ai_explanation` | `aiExplanation` |
| `tags: TagDetails[]` | `tags: string[]` |

Map at the boundary — see §12.

### Shape differences that will break rendering

1. **`author` does not exist on a snippet.** `SnippetDetails` carries only
   `author_id: UUID`. `SnippetCard` renders `snippet.author.username`, `@username`, and
   an avatar — none of that is in the payload. Join from a cached author map built from
   `GET /api/community/users?limit=100`. ✅ `SnippetCard` takes an optional
   `authors?: Map<string, Author>` for exactly this.

   ⚠️ **Comments are the exception** — `CommentDetails` nests `author: { id, name,
   username }` (see §6b).

2. **`tags` are objects, not strings.** `{ id, name, slug }[]`, vs `string[]`.
   `snippet.tags.map(t => <Tag>{t}</Tag>)` renders `[object Object]`. Use `t.name`.

3. **Every nullable field is `null`, not `""`.** `description`, `username`, `bio`,
   `website`, `ai_explanation`, `profile_image` can all be `null`. Guard before
   `.trim()` / `.toLowerCase()` / rendering. ✅ `mappers.ts` coerces `description` to `''`
   and derives a fallback `username` from the author id, so `types.ts` keeps its
   non-nullable domain types.

4. **`uuid7` IDs** — always strings, never numbers.

5. **Timestamps are ISO 8601 with timezone**, e.g. `2025-03-16T12:00:00+00:00`.
   `new Date(...)` parses directly. ✅ `format.ts`'s `relativeTime` no longer has a
   hardcoded `now` default — it was pinned to `new Date('2025-03-16T12:00:00Z')` for the
   mock data, which made every real timestamp read "5mo ago" forever.

6. **`UserDetails` has no `created_at`.** A "member since" date for the signed-in
   account has no source; don't render one on the profile page.

---

## 11. Endpoints the UI expects but the backend lacks

**Still absent** after reading every router. Each would need a new model/table or an
external integration, not just a route:

| Wanted | Status |
| --- | --- |
| Likes / favourites | ❌ — `favourited` in `types.ts` has no backing field. |
| Dashboard stats | ❌ — totals must be computed client-side from `GET /api/snippets` (now with `total`, so this is cheap). |
| Language list / counts | ❌ — derive from the `language` values you receive. |
| Per-week activity ("↑ N this week") | ❌ — nothing records per-week activity at all. |
| OAuth login (GitHub / Google) | ❌ — `OAuthAccount` model + `OAuthProvider` enum exist, no routes. The "Continue with GitHub/Google" buttons on `AuthPage` have nothing to call. |

**Added since the first draft of this guide** (see §0 for the full changelog):

| Wanted | Now |
| --- | --- |
| AI explanation | ✅ `POST /api/ai/explain`, `POST /api/ai/generate-title`, `POST /api/snippets/{id}/explain` — §5b. |
| Trending snippets | ✅ `GET /api/snippets/trending` |
| Comments | ✅ `GET/POST /api/snippets/{id}/comments`, `DELETE /api/comments/{id}` — §6b. New `comments` table, CASCADE on both user and snippet. |
| Author display names | ✅ `name` added to `CommunityUserDetails` — §6. |
| `POST /api/auth/password/forgot` | ✅ §3 |

---

## 12. The client, as built

`frontend/src/lib/api.ts` + `lib/mappers.ts` + `hooks/useAuth.tsx` implement this. The
shape that matters:

```ts
// mappers.ts — backend → frontend shape, in one place.
export function toSnippet(d: SnippetDto, authors?: Map<string, Author>): Snippet {
  const author = authors?.get(d.author_id) ?? fallbackAuthor(d.author_id)
  return {
    id: d.id,
    title: d.title,
    description: d.description ?? '',        // ← nullable in the wire shape
    code: d.code,
    language: toLanguage(d.language),
    tags: d.tags.map((t) => t.name),         // ← objects → strings
    visibility: d.is_public ? 'public' : 'private',
    copies: d.copy_count,
    aiExplanation: d.ai_explanation ?? undefined,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    authorId: d.author_id,
    author,
  }
}
```

Two things `request()` handles that a naive `fetch` wrapper will get wrong:

1. **Error normalisation.** The three shapes in §2 collapse into one `ApiError` carrying
   `status` and, for 422s, `fields: Record<string, string>`. Without this every 429 renders
   as a blank failure, because slowapi keys it `error` rather than `detail`.
2. **Single-flight refresh.** One 401 triggers one refresh and one replay. A page firing six
   parallel fetches does not fire six refreshes. A refresh that fails ends the session
   (`sv:session-lost`), which `useAuth` handles by clearing state — `api.ts` can't import
   the router, so it dispatches an event instead.

Token storage is `localStorage` under `sv.access` / `sv.refresh` (there is no cookie
flow), wrapped in try/catch so private-browsing quota errors don't throw at import.

---

## 13. Full route index

| Method | Path | 🔒 | Status |
| --- | --- | :-: | --- |
| `GET` | `/api/health` | | `200` |
| `POST` | `/api/ai/explain` | 🔒 | `200` |
| `POST` | `/api/ai/generate-title` | 🔒 | `200` |
| `POST` | `/api/auth/signup` | | `201` |
| `POST` | `/api/auth/login` | | `200` |
| `POST` | `/api/auth/refresh` | | `200` |
| `POST` | `/api/auth/logout` | | `200` |
| `GET` | `/api/auth/profile` | 🔒 | `200` |
| `PATCH` | `/api/auth/profile` | 🔒 | `200` |
| `PATCH` | `/api/auth/email` | 🔒 | `200` |
| `POST` | `/api/auth/email/verify` | | `200` |
| `POST` | `/api/auth/email/resend` | 🔒 | `200` |
| `POST` | `/api/auth/email/resend-unauthenticated` | | `200` |
| `PATCH` | `/api/auth/password` | 🔒 | `200` |
| `POST` | `/api/auth/password/forgot` | | `200` |
| `POST` | `/api/auth/password/reset` | | `200` |
| `DELETE` | `/api/auth/account` | 🔒 | `200` |
| `GET` | `/api/snippets/public` | | `200` |
| `GET` | `/api/snippets/public/{id}` | | `200` |
| `GET` | `/api/snippets` | 🔒 | `200` |
| `GET` | `/api/snippets/{id}` | 🔒 | `200` |
| `POST` | `/api/snippets` | 🔒 | `201` |
| `PATCH` | `/api/snippets/{id}` | 🔒 | `200` |
| `DELETE` | `/api/snippets/{id}` | 🔒 | `200` |
| `GET` | `/api/snippets/trending` | | `200` |
| `POST` | `/api/snippets/{id}/explain` | 🔒 | `200` |
| `POST` | `/api/snippets/{id}/copy` | 🔒 | `200` |
| `POST` | `/api/snippets/{id}/bookmark` | 🔒 | `201` |
| `DELETE` | `/api/snippets/{id}/bookmark` | 🔒 | `200` |
| `GET` | `/api/bookmarks` | 🔒 | `200` |
| `GET` | `/api/snippets/{id}/comments` | | `200` |
| `POST` | `/api/snippets/{id}/comments` | 🔒 | `201` |
| `DELETE` | `/api/comments/{id}` | 🔒 | `200` |
| `GET` | `/api/community/users` | | `200` |
| `GET` | `/api/community/users/{id}` | | `200` |
| `GET` | `/api/community/users/{id}/snippets` | | `200` |
| `POST` | `/api/collections` | 🔒 | `201` |
| `GET` | `/api/collections` | 🔒 | `200` |
| `GET` | `/api/collections/{id}` | 🔒 | `200` |
| `GET` | `/api/collections/{id}/snippets` | 🔒 | `200` |
| `PATCH` | `/api/collections/{id}` | 🔒 | `200` |
| `DELETE` | `/api/collections/{id}` | 🔒 | `200` |
| `POST` | `/api/collections/{id}/snippets` | 🔒 | `201` |
| `DELETE` | `/api/collections/{id}/snippets/{snippet_id}` | 🔒 | `200` |

---

## 14. Env vars the frontend depends on

`backend/.env` is loaded by `config/env_config.py`, which **raises at import** if
`DATABASE_URL`, `JWT_SECRET_KEY`, `GOOGLE_GEMINI_API_KEY` or `GOOGLE_GEMINI_MODEL` are
missing. The backend won't start — so the frontend can assume it's up.

`FRONTEND_URL` is the one the frontend team owns:

```
FRONTEND_URL=http://localhost:5173
```

It drives **both** CORS and the verification link (`build_verification_url`). Set it to
the deployed origin in production or links will point at localhost.

⚠️ `.env.example` is out of sync with `env_config.py` — it lists `SECRET_KEY`,
`ALGORITHM`, `ACCESS_TOKEN_EXPIRE_DAYS` and `GEMINI_API_KEY`, but the code reads
`JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` and
`GOOGLE_GEMINI_API_KEY`. Copying `.env.example` verbatim gives you `AttributeError` /
a crash on `int(None)`.