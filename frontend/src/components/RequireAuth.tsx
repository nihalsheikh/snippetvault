/**
 * Route guard for the authenticated app.
 *
 * While the session is still resolving it renders a placeholder rather than
 * redirecting — otherwise a reload on `/dashboard` would bounce the user to `/auth`
 * for the fraction of a second it takes `GET /auth/profile` to answer, then send
 * them back. Only a resolved `anon` status counts as "please sign in".
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'

/** Renders its child route, or redirects to sign in when there is no session. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="animate-pulse font-mono text-[12px] text-t3">
          Loading your library…
        </span>
      </div>
    )
  }

  if (status === 'anon') {
    // `state.from` lets the login page send the user back where they were headed.
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}