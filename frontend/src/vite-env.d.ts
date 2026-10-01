/// <reference types="vite/client" />

/**
 * The View Transitions API isn't in TypeScript's DOM lib yet. Only the surface
 * this app uses is declared — see `src/hooks/useTheme.ts`.
 */
interface ViewTransition {
  readonly ready: Promise<void>
  readonly finished: Promise<void>
  readonly updateCallbackDone: Promise<void>
  skipTransition(): void
}

interface Document {
  startViewTransition?(updateCallback: () => void | Promise<void>): ViewTransition
}