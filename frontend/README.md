# SnippetVault — Frontend

React 19 + Vite 6 + TypeScript + Tailwind CSS v4 frontend for SnippetVault.

The visual design is a direct port of `../snippetvault-v2.html`. Every colour, radius,
font and spacing value lives in `src/styles/theme.css` as a CSS custom property and is
exposed to Tailwind through `@theme inline`, so every page can use semantic classes
(`bg-s1`, `text-t3`, `border-b1`, `text-lime`) that re-theme automatically.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
npm run preview  # serve the production build
```

The dev server proxies `/api` to `http://localhost:8000`, which is where the FastAPI
backend runs.

## Routes

| Path               | Screen                              |
| ------------------ | ----------------------------------- |
| `/`                | Landing page                        |
| `/auth`            | Sign in / create account (split)    |
| `/pricing`         | Pricing                             |
| `/docs`            | API docs                            |
| `/community`       | Community library                   |
| `/dashboard`       | Snippet dashboard                   |
| `/snippets/new`    | New snippet (Monaco editor)         |
| `/snippet/:id`     | Snippet detail                      |
| `/profile`         | Profile & settings                  |

## Structure

```
src/
  components/
    ui/          Button, Input, Chip, Toggle, Avatar, CodeBlock, SnippetCard…
    layout/      SiteFooter, DashboardSidebar, CommandPalette
  hooks/         useTheme
  layouts/       SiteLayout (marketing shell), AppLayout (authenticated shell)
  lib/           types, data (mock), highlight (tokenizer), languages, format
  pages/         one file per route
  styles/        theme.css — design tokens + Tailwind entry
```

## Conventions

- **Icons** — `lucide-react`. Its outline set is the closest match to the design's
  thin geometric line work.
- **Editor** — `@monaco-editor/react`, as specified by the design. It pulls Monaco from
  a CDN by default; to self-host, install `monaco-editor` and pass `loader.config({ monaco })`.
- **Syntax highlighting outside the editor** — `src/lib/highlight.ts` is a small
  tokenizer that reproduces the design's `.kw / .fn / .str / .cm / .tp / .num / .prop`
  palette. Monaco handles real editing; this handles card previews and the auth panel.
- **State** — mock data lives in `src/lib/data.ts`. Replace those reads with your API
  client when the backend endpoints land; the shapes in `src/lib/types.ts` already
  match the intended API contract.

## Where the backend hooks in

These are the spots currently stubbed, ready for your FastAPI routes:

| Location     | Endpoint                              |
| ------------ | ------------------------------------- |
| `AuthPage`   | `POST /api/auth/login`, `/api/auth/register` |
| `NewSnippetPage` | `POST /api/snippets`, `/api/snippets/explain` |
| `DashboardPage`, `CommunityPage`, `SnippetDetailPage` | `GET /api/snippets`, `GET /api/snippets/{id}` |

`vite.config.ts` already proxies `/api` → `http://localhost:8000`.

## Theming

Dark by default, following `prefers-color-scheme` on first load, then persisted to
`localStorage` under `sv-theme`. `index.html` applies the stored theme before first
paint so there's no flash. `useTheme()` exposes the current value, a setter, and a
`toggleTheme(origin)` helper, and observes the `html` element so Monaco can swap
between `vs` and `vs-dark`.

### Circular view-transition wipe

Theme changes animate as a circle expanding from the point you clicked, using the
View Transitions API (the approach from
[akashhamirwasia.com](https://akashhamirwasia.com/blog/full-page-theme-toggle-animation-with-view-transitions-api/)).

- `src/hooks/useTheme.ts` — `toggleTheme()` wraps the class swap in
  `document.startViewTransition()` and animates `clip-path` on
  `::view-transition-new(root)` out to a radius that reaches the furthest viewport corner.
- `src/styles/theme.css` — `::view-transition-old/new(root) { animation: none }` disables
  the default cross-fade so only the wipe runs. Without it the two blend and the
  animation looks muddy.
- `src/vite-env.d.ts` — ambient types for `startViewTransition`, which TypeScript's
  DOM lib doesn't ship yet.

Browsers without the API (Safari, older Firefox) fall back to an instant swap.
`prefers-reduced-motion` suppresses it too.