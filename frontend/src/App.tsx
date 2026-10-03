import { Routes, Route, useParams } from 'react-router-dom'

import { SiteLayout } from '@/layouts/SiteLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { RequireAnon } from '@/components/RequireAnon'
import { RequireAuth } from '@/components/RequireAuth'

import { LandingPage } from '@/pages/LandingPage'
import { AuthPage } from '@/pages/AuthPage'
import { DocsPage } from '@/pages/DocsPage'
import { CommunityPage } from '@/pages/CommunityPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CollectionsPage } from '@/pages/CollectionsPage'
import { SnippetDetailPage } from '@/pages/SnippetDetailPage'
import { NewSnippetPage } from '@/pages/NewSnippetPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { UserPage } from '@/pages/UserPage'
import { VerifyEmailPage } from '@/pages/VerifyEmailPage'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ErrorPage } from '@/pages/ErrorPage'

// Explore and Community share a pathname and differ only by `sort`, so the top bar
// matches on the query string too — see `isSameView` in lib/nav.ts.
const APP_LINKS = [
  { to: '/dashboard', label: 'My Snippets' },
  { to: '/community', label: 'Community' },
  { to: '/community?sort=trending', label: 'Explore' },
]

/** Reads the `:status` param and hands the numeric code to the shared page. */
function ErrorPageRoute() {
  const { status } = useParams()
  const parsed = Number.parseInt(status ?? '', 10)
  return <ErrorPage status={Number.isFinite(parsed) ? parsed : 500} />
}

export default function App() {
  return (
    <Routes>
      {/* Public marketing pages. A signed-in visitor has no use for the landing page
          or the sign-in form, so `RequireAnon` sends them to their library instead. */}
      <Route element={<RequireAnon />}>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>
        {/* Auth is a full-screen split, so it sits outside the site shell */}
        <Route path="/auth" element={<AuthPage />} />
      </Route>

      {/* The OAuth redirect target. Deliberately outside `RequireAnon`: this page is
          what *establishes* the session, so a guard that redirects anyone already
          signed in would be judging the previous state rather than this one. */}
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />

      <Route element={<SiteLayout />}>
        <Route path="/docs" element={<DocsPage />} />
        {/* Arrives from an email, so they stand alone too */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Community is public, so it keeps the top bar but gets the sidebar only when
          signed in — the rail is the viewer's own library, not part of the page. */}
      <Route element={<AppLayout links={APP_LINKS} />}>
        <Route path="/community" element={<CommunityPage />} />
      </Route>

      {/* Authenticated app */}
      <Route element={<AppLayout links={APP_LINKS} />}>
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/snippets/new" element={<NewSnippetPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Public snippets and member profiles are viewable signed out, so these stay
          unguarded — the pages fall back to the public endpoints with no session.
          Neither needs the library rail beside it. */}
      <Route element={<AppLayout links={APP_LINKS} sidebar={false} />}>
        <Route path="/snippet/:id" element={<SnippetDetailPage />} />
        <Route path="/user/:id" element={<UserPage />} />
      </Route>

      <Route element={<SiteLayout />}>
        {/* `/error/500` and friends, for anything that needs to show a specific
            code. `?code=` on the bare path works too. */}
        <Route path="/error/:status" element={<ErrorPageRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
