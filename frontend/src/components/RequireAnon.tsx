/**
 * Route guard for the pages a signed-in user has no reason to see: the landing page and
 * the sign-in / sign-up split. Someone with a session lands in their library instead of
 * clicking through marketing copy to get somewhere they already are.
 *
 * The `loading` wait is what keeps a hard reload of `/` from flashing the landing page
 * before the stored token is checked — the same reasoning as `RequireAuth`.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'

/** Where a signed-in visitor goes. The dashboard is the app's actual home. */
const SIGNED_IN_HOME = '/dashboard'

/** The routes this guard wraps — never a valid destination for a signed-in user. */
const GUARDED_PATHS = new Set(['/', '/auth'])

export function RequireAnon() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="animate-pulse font-mono text-[12px] text-t3">Loading…</span>
      </div>
    )
  }

  if (status === 'authed') {
    // `state.from` is written by the auth *form* ("you signed in, back to where you
    // were"). That destination is one of the two pages guarded right here, so honouring
    // it would send the user straight back into this redirect — check for that and fall
    // through to the library instead.
    const from = (location.state as { from?: string } | null)?.from
    const target = from && !GUARDED_PATHS.has(from.split('?')[0]) ? from : SIGNED_IN_HOME
    return <Navigate to={target} replace />
  }

  return <Outlet />
}
