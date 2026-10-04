# Snippet Vault

Save code snippets, organise them into collections, and share them publicly. Anyone can
browse and copy what others have posted; signing in adds private snippets, collections,
bookmarks and AI explanations.

Built as a **FastAPI** backend and a **React 19 + Vite + Tailwind** frontend, deployed
as two separate services — the frontend on Vercel, the API on Render, against a
managed Postgres.

**Live:** [snippetvault-jet.vercel.app](https://snippetvault-jet.vercel.app)

---

## Contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Demo data](#demo-data)
- [Deployment](#deployment)
- [Project layout](#project-layout)
- [Design notes](#design-notes)
- [Troubleshooting](#troubleshooting)

---

## What it does

**Accounts.** Email and password sign-up, plus optional Google and GitHub sign-in.
Email verification, password reset, profile editing (display name, unique handle, bio,
website), and account deletion. Access and refresh tokens, with the client refreshing
transparently on expiry.

**Snippets.** Create and edit a snippet with a title, description, code, language and
tags. Markdown-free — the description is plain text. Every snippet is public or private;
public ones appear in Community, Explore and on your profile. The editor is Monaco with
lightweight per-language syntax highlighting, and there's a copy button on every snippet
that increments a counter.

**Filtering.** Search by title, filter by language and by tag, and sort. The sidebar
filters your own library by language; the per-language counts are derived from the
snippets actually loaded, so they reflect the current page rather than the whole
database.

**Collections.** Private, named groups of your own snippets, with their own description.

**Bookmarks.** Save other people's public snippets and find them under Saved.

**Comments.** Threaded discussion on any public snippet, filtered for profanity and
link-spam on the server before it's stored.

**Community.** Browse all public snippets and all members, sorted by newest or by
trending (most copied). Any member's public profile is viewable signed out.

**AI.** Explain a saved snippet in plain language, or get a title suggested for one you
are still writing. Both go through Gemini; an explanation is saved against the snippet
so it isn't recomputed on every view.

**Interface.** Light and dark themes, responsive from 375px up, a command palette
(<kbd>⌘K</kbd>/<kbd>Ctrl K</kbd>), and generated avatars so no account is faceless.

---

## Architecture

Two independently deployable services sharing one Postgres database.

```
┌──────────────────────┐        /api/*  (same-origin)       ┌───────────────────────┐
│  Vercel              │  ─────────────────────────────────▶  │  Render               │
│  React SPA           │                                     │  FastAPI (uvicorn)    │
│  static assets       │                                     │                       │
└──────────────────────┘                                     └───────────┬───────────┘
                                                                          │
                                                            ┌─────────────▼────────────┐
                                                            │  PostgreSQL (managed)    │
                                                            │                          │
                                                            │  users · snippets · tags │
                                                            │  comments · collections  │
                                                            │  bookmarks · oauth       │
                                                            │  refresh + email tokens  │
                                                            └──────────────────────────┘
```

**The frontend never calls the API cross-origin.** Every request goes to a relative
`/api/...` path, and something rewrites that to the backend:

- **Locally** — Vite's dev proxy forwards `/api` to `localhost:8000`.
- **Deployed** — `frontend/vercel.json` rewrites `/api/:path*` to the Render host.

So there is one code path in both environments, no `VITE_API_URL` to keep in sync, and
no CORS preflight on ordinary calls. CORS is still configured on the backend because
OAuth callbacks and direct API access need it.

**Sessions.** The API issues a short-lived access token and a longer-lived refresh
token. The frontend keeps both in `localStorage` and, on a 401, spends the refresh
token on a new access token and replays the original request — one refresh at a time,
however many requests were in flight. The refresh token is also stored server-side, so
logout can revoke it.

**Schema.** Tables are created by `Base.metadata.create_all()` at startup rather than by
Alembic migrations. There is no migration history to keep in step yet; if the schema
starts changing shape in production, that is the first thing to add.

---

## Tech stack

**Backend** — Python 3.14, FastAPI, SQLAlchemy 2.1 (ORM + Core), Pydantic v2,
PostgreSQL via psycopg 3, JWT auth via PyJWT, bcrypt passwords, slowapi rate limiting,
Google Gen AI SDK for the AI features, Brevo for transactional email, uvicorn.

**Frontend** — React 19, TypeScript (strict), Vite 6, Tailwind CSS v4, React Router
v7, `@monaco-editor/react`, lucide-react. No component library and no state-management
library: auth is one context, everything else is local state.

---

## Getting started

**Prerequisites** — Node 18+, Python 3.14+, and a Postgres database you can reach.
Managed Postgres (Neon, Supabase, Render, Railway) is the easiest option; a local one
works too.

### 1. Backend

```bash
cd backend

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

Copy the example environment file and fill it in:

```bash
cp .env.example .env
```

At minimum `DATABASE_URL`, `JWT_SECRET_KEY`, `GOOGLE_GEMINI_API_KEY` and
`GOOGLE_GEMINI_MODEL` are required — the app refuses to start without them. See
[Configuration](#configuration).

Then:

```bash
uvicorn main:app --reload --port 8000
```

The API is on `http://localhost:8000`. Interactive docs at `/docs`. Tables are created
on first boot, so an empty database is all you need to start.

### 2. Frontend

In a second terminal:

```bash
cd frontend

npm install
npm run dev
```

The app is on `http://localhost:5173` and proxies `/api` to the backend, so there is
nothing to configure for local development.

### 3. Demo data (optional)

To skip making your own account, seed a dataset — see [Demo data](#demo-data).

---

## Configuration

All backend settings are read from `backend/.env` by `config/env_config.py`. The names
below must match exactly; the app raises on import if a required one is missing.

| Variable | Required | What it's for |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. |
| `JWT_SECRET_KEY` | yes | Signs access and refresh tokens. Use a long random value. |
| `GOOGLE_GEMINI_API_KEY` | yes | Key for the AI features. |
| `GOOGLE_GEMINI_MODEL` | yes | Model id. See the note below. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | yes | Access token lifetime. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | yes | Refresh token lifetime. |
| `JWT_ALGORITHM` | no | Defaults to `HS256`. |
| `FRONTEND_URL` | no | CORS origin, and the base for links in emails. Defaults to `http://localhost:5173`. |
| `BACKEND_URL` | no | This API's own public URL, used to build absolute links in emails. |
| `BREVO_API_KEY` | no | Transactional email. Without it, verification and reset emails are not sent. |
| `BREVO_SENDER_EMAIL` | no | Verified sender address. |
| `BREVO_SENDER_NAME` | no | Display name on those emails. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Google sign-in. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | no | GitHub sign-in. |

> **`GOOGLE_GEMINI_MODEL` must be a model your key can actually reach.** A wrong id is
> the single most common reason the AI features fail, and the error only shows up as a
> 502 at the moment you click the button. Check the list your key has access to rather
> than copying an id from a blog post.

> **`DATABASE_URL` accepts `postgres://` as well as `postgresql://`.** Managed Postgres
> dashboards hand out the shorter form, and the backend normalises it for you.

**Social sign-in is optional.** Leave a provider's credentials blank and its button is
hidden automatically — the frontend asks the backend which providers are configured
rather than showing a dead button. Each provider needs its exact redirect URI
registered, including for local development (Google rejects a consent screen whose
redirect URI is not on its list, even in dev):

```
{BACKEND_URL}/api/auth/oauth/google/callback
{BACKEND_URL}/api/auth/oauth/github/callback
```

**The frontend has no environment variables.** Everything is same-origin, so there is
nothing to configure at build time.

---

## Demo data

`backend/scripts/seed_demo_data.py` fills an empty database with 16 accounts, 27
snippets across 8 languages, 45 tags, 32 comments, 10 collections and ~100 bookmarks —
enough to see every view with real content in it rather than empty states.

```bash
cd backend
.venv/bin/python -m scripts.seed_demo_data
```

**Every demo account signs in with the password `John#123`.** Each has its own address —
`ada.lovelace@example.com`, `grace.hopper@example.net`, `alan.turing@example.org` — all
on domains reserved by RFC 2606, which cannot resolve to a real mailbox, so triggering a
password reset on a demo account sends nothing anywhere. Every account is marked as
having confirmed its email, so you land straight in the app rather than on a
verification notice.

| Flag | What it does |
|---|---|
| `--reset` | Delete the demo rows first, then re-seed. Matches on the demo emails only, so it can never touch a real account. |
| `--no-verify` | Leave a few accounts unverified, so the "check your inbox" banner is testable. |

**Re-running is safe.** A second run tops up rather than duplicating: users are matched
on email, snippets on author and title, comments on their text, and bookmarks are
keyed on the user rather than on a fresh random draw. Copy counts and timestamps come
from a fixed seed, so re-running produces the same dataset rather than a reshuffled one.

To seed the deployed database instead of your local one, export the connection string
first so there is no chance of pointing it at the wrong server:

```bash
DATABASE_URL='postgresql://…' python -m scripts.seed_demo_data
```

---

## Deployment

The frontend and backend deploy separately.

### Frontend — Vercel

Import the repository, set the root directory to `frontend`, and use the detected
framework defaults (`npm run build`, output `dist`). No environment variables.

`frontend/vercel.json` rewrites `/api/:path*` to the backend, so that same-origin
assumption holds in production.

### Backend — Render

- **Root directory:** `backend`
- **Build command:** `pip install -r requirements.txt`
- **Start command:**

  ```
  uvicorn main:app --host 0.0.0.0 --port $PORT
  ```

  `--host 0.0.0.0` is required: without it uvicorn binds to loopback and nothing can
  reach it from outside the container.

Add the variables from [Configuration](#configuration] in the Render dashboard, using
your deployed frontend's URL for `FRONTEND_URL` and the Render URL for `BACKEND_URL`.

**Free-tier note.** Render's free instances sleep after inactivity, so the first request
after a pause takes ~30 seconds while the service wakes. Fine for a demo; use a paid
instance for anything real.

### After deploying

1. Open the frontend and confirm it loads with data.
2. Check the API's health endpoint returns `200`.
3. If using social sign-in, add the **production** redirect URIs to each provider as
   well as the local ones.

---

## Project layout

```
snippetvault/
├── backend/
│   ├── main.py                 # app assembly, middleware, router registration
│   ├── config/                 # environment settings
│   ├── database/               # engine, session factory, Base
│   ├── models/                 # SQLAlchemy models, one per table
│   ├── schemas/                # Pydantic request/response models
│   ├── routes/                 # HTTP endpoints
│   ├── services/               # AI and OAuth logic
│   ├── auth/                   # hashing, JWT, refresh tokens
│   ├── middleware/             # rate limiting, error handlers
│   ├── utils/                  # db dependency, moderation, usernames
│   ├── emails/                 # templates and Brevo delivery
│   └── scripts/
│       └── seed_demo_data.py   # demo dataset
└── frontend/
    ├── vercel.json             # /api rewrite for production
    └── src/
        ├── lib/api.ts          # every backend call, error handling, token refresh
        ├── lib/types.ts        # domain types
        ├── lib/dto.ts          # backend response shapes
        ├── lib/mappers.ts      # DTO -> domain
        ├── hooks/              # auth, theme, debounce
        ├── components/         # ui primitives and layout
        ├── layouts/            # site shell vs app shell
        ├── pages/              # one per route
        └── styles/theme.css    # design tokens, light and dark
```

---

## Design notes

A few decisions that aren't obvious from the code.

**Tokens live in `localStorage`.** Simple, and it survives a reload, but it is readable
by any script on the page. For a public snippet-sharing app this is an acceptable trade;
an app handling anything more sensitive should move to `HttpOnly` cookies with `SameSite`
and CSRF protection.

**Private snippets return 404, not 403.** A 403 confirms the snippet exists, which
tells an outsider that someone has written something private. A 404 leaks nothing.

**The API hides OAuth credentials from the response.** Tokens are returned in the URL
*fragment*, which the browser never sends to a server, and the state parameter is
compared in constant time.

**Rate limiting** is per-IP on auth and write endpoints, to blunt credential stuffing
and abuse of the AI endpoints, which cost money per call.

**Comments are moderated on write**, not on read, so moderation failures are visible
immediately to the person who posted.

**No billing.** There is no plan, limit, or subscription anywhere in the system, and no
UI claiming otherwise — a "free tier: 0/100" badge would describe a ceiling the server
doesn't enforce.

---

## Troubleshooting

**`RuntimeError: DATABASE_URL not set`** — the app reads `.env` from the directory it's
started in. Run uvicorn from `backend/`, and confirm `.env` exists there (it's
gitignored; copy `.env.example`).

**`ModuleNotFoundError: No module named 'psycopg'`** — you installed `psycopg2`, or the
install was skipped. SQLAlchemy 2.1 imports psycopg **3** for a `postgresql://` URL and
no longer falls back to psycopg2. Install from `requirements.txt`, which pins
`psycopg[binary]`. psycopg2 has no wheels for Python 3.14, so it fails silently there
and only surfaces at import.

**AI features return 502** — almost always `GOOGLE_GEMINI_MODEL`. It must be a model your
key can reach. Check the API key too, and note that the AI endpoints require a signed-in
user.

**No verification or reset email arrives** — check `BREVO_API_KEY` and confirm
`BREVO_SENDER_EMAIL` is a sender address Brevo has verified. Both links are built from
`BACKEND_URL` and `FRONTEND_URL`, so those must be the URLs you actually visit.

**Social sign-in button missing** — the provider has no client id or secret on the
backend. The button is hidden on purpose rather than shown broken.

**`Failed to fetch` from the browser** — the rewrite isn't in place. Locally, check that
Vite's proxy is configured and the backend is on port 8000; deployed, check
`frontend/vercel.json`.

**Frontend builds but `tsc` reports unused imports** — the project uses
`noUnusedLocals` and `noUnusedParameters`. Remove them; `npm run typecheck` runs the
same check.
