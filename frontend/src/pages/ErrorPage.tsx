import { Component } from 'react'
import { Link } from 'react-router-dom'
import { AlertOctagon, Home, RotateCcw, ServerCrash, ShieldAlert, Timer } from 'lucide-react'

import { Button, ButtonLink } from '@/components/ui/Button'

interface Copy {
  icon: React.ReactNode
  title: string
  message: string
  retryable: boolean
}

const COPY: Record<number, Copy> = {
  400: {
    icon: <ShieldAlert size={28} />,
    title: "That request didn't look right.",
    message: 'Something in what was sent was malformed. Go back, check the details, and try again.',
    retryable: true,
  },
  401: {
    icon: <ShieldAlert size={28} />,
    title: 'You need to sign in.',
    message: 'Your session has expired or was never started. Sign in again and we will bring you back here.',
    retryable: true,
  },
  403: {
    icon: <ShieldAlert size={28} />,
    title: "This one's off limits.",
    message: 'Your account does not have access to this. If you think it should, check that you are signed in as the right person.',
    retryable: false,
  },
  404: {
    icon: <AlertOctagon size={28} />,
    title: "We couldn't find that.",
    message: 'The page you were looking for was moved, deleted, or never saved in the first place.',
    retryable: true,
  },
  409: {
    icon: <Timer size={28} />,
    title: 'That already happened.',
    message: 'This link or action has already been used. Head back and pick up where you left off.',
    retryable: false,
  },
  410: {
    icon: <Timer size={28} />,
    title: 'This link has expired.',
    message: 'It was only good for a short window. Request a fresh one and carry on.',
    retryable: false,
  },
  429: {
    icon: <Timer size={28} />,
    title: 'Slow down a moment.',
    message: 'Too many requests in a row. Give it a minute and it will open back up.',
    retryable: true,
  },
  500: {
    icon: <ServerCrash size={28} />,
    title: 'Something broke on our side.',
    message: 'This one is ours, not yours. We have been notified. Try again in a moment.',
    retryable: true,
  },
  502: {
    icon: <ServerCrash size={28} />,
    title: 'Upstream service unavailable.',
    message: 'A service we depend on did not answer. This is usually brief — try again shortly.',
    retryable: true,
  },
  503: {
    icon: <ServerCrash size={28} />,
    title: 'Back for maintenance.',
    message: 'We are doing some work on the vault. It will be open again shortly.',
    retryable: true,
  },
}

const DEFAULT_COPY: Copy = {
  icon: <ServerCrash size={28} />,
  title: 'Something went wrong.',
  message: 'An unexpected error occurred. Try again, and if it keeps happening we would like to hear about it.',
  retryable: true,
}

/** `?code=` lets `/error/500` links and manual navigation share one route. */
function codeFromSearch(): number {
  if (typeof window === 'undefined') return 500
  const raw = new URLSearchParams(window.location.search).get('code')
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsed) && parsed >= 400 && parsed <= 599 ? parsed : 500
}

export function ErrorPage({ status }: { status?: number }) {
  const code = status ?? codeFromSearch()
  const copy = COPY[code] ?? { ...DEFAULT_COPY, title: `Error ${code}.` }
  const isServerError = code >= 500

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div
        className={`mb-4 font-mono text-[11px] uppercase tracking-[2px] ${
          isServerError ? 'text-red' : 'text-lime'
        }`}
      >
        {code}
      </div>

      <div
        className={`mb-6 flex h-[64px] w-[64px] items-center justify-center rounded-full border ${
          isServerError
            ? 'border-[color-mix(in_srgb,var(--red)_35%,transparent)] bg-[color-mix(in_srgb,var(--red)_10%,transparent)] text-red'
            : 'border-b2 bg-s2 text-t3'
        }`}
      >
        {copy.icon}
      </div>

      <h1 className="mb-3 font-serif text-[clamp(28px,4.5vw,44px)] leading-[1.1] tracking-[-1.2px]">
        {copy.title}
      </h1>

      <p className="mb-8 max-w-[420px] text-[15px] leading-[1.7] text-t2">{copy.message}</p>

      <div className="flex flex-wrap justify-center gap-3">
        {copy.retryable ? (
          <Button size="lg" onClick={() => window.location.reload()}>
            <span className="flex items-center gap-2">
              <RotateCcw size={14} /> Try again
            </span>
          </Button>
        ) : null}

        <ButtonLink to="/dashboard" size="lg" variant={copy.retryable ? 'ghost' : undefined}>
          Back to your library
        </ButtonLink>
      </div>

      <Link to="/" className="mt-8 font-mono text-[12px] text-t3 no-underline hover:text-t1">
        <span className="flex items-center justify-center gap-1.5">
          <Home size={12} /> or go back to the homepage
        </span>
      </Link>
    </div>
  )
}

interface BoundaryState {
  error: Error | null
}

/**
 * Catches render-time throws anywhere below it. Without this, a bug in any page
 * blanks the whole app and React shows an empty white document with the error
 * only in the console.
 */
export class ErrorBoundary extends Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Deliberately not sending this anywhere — this is the console line that
    // makes the failure debuggable in development.
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return <ErrorPage status={500} />
  }
}