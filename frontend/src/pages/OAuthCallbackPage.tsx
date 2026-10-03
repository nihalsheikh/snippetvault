/**
 * Where the provider redirect lands.
 *
 * The backend has already exchanged its authorization code and minted a session by
 * the time this renders — all that's left is to move the tokens out of the URL and
 * into the same store a password login uses, then get out of the way.
 *
 * The tokens arrive in the fragment, which is why this works: a fragment is never
 * sent to a server, never written to an access log, and never leaks through a
 * `Referer` header. The address bar is scrubbed with `replaceState` immediately, so a
 * refresh can't replay them and they don't sit in a screenshot.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LoaderPanel } from '@/components/ui/Loader'
import { useAuth } from '@/hooks/useAuth'
import { tokens } from '@/lib/api'

type State =
  | { kind: 'working' }
  | { kind: 'failed'; message: string }

export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [state, setState] = useState<State>({ kind: 'working' })
  // The effect below runs once per mount, not per re-render. Without this, React
  // StrictMode's double-invoke would try to store the same tokens twice and then
  // navigate twice.
  const settled = useRef(false)

  useEffect(() => {
    if (settled.current) return
    settled.current = true

    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const failure = fragment.get('oauth_error')
    const access = fragment.get('access_token')
    // Named `refreshToken` rather than `refresh`, which is the re-read function
    // destructured from the same hook below.
    const refreshToken = fragment.get('refresh_token')

    // Scrub the URL before anything else can fail, so a reload of this page can't
    // replay a token that was already used.
    window.history.replaceState(null, '', window.location.pathname)

    if (failure) {
      setState({ kind: 'failed', message: failure })
      return
    }

    if (!access || !refreshToken) {
      setState({
        kind: 'failed',
        message: "That sign-in didn't complete. Please try again.",
      })
      return
    }

    tokens.set(access, refreshToken)

    // `refresh` re-reads the profile, so the shell is already hydrated when the
    // destination renders — the same handoff a password login does.
    void refresh()
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => {
        setState({
          kind: 'failed',
          message: "Signed in, but we couldn't load your profile. Try again.",
        })
      })
  }, [refresh, navigate])

  if (state.kind === 'failed') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-[28px] tracking-[-0.5px]">Sign-in didn't finish</h1>
        <p className="max-w-[380px] text-[13px] text-t2">{state.message}</p>
        <a
          href="/auth"
          className="text-[13px] font-semibold text-lime no-underline hover:underline"
        >
          Back to sign in →
        </a>
      </div>
    )
  }

  return <LoaderPanel label="Finishing sign-in" className="min-h-screen" />
}
