import { Routes, Route } from 'react-router-dom'

import { SiteLayout } from '@/layouts/SiteLayout'
import { AppLayout } from '@/layouts/AppLayout'

import { LandingPage } from '@/pages/LandingPage'
import { AuthPage } from '@/pages/AuthPage'
import { PricingPage } from '@/pages/PricingPage'
import { DocsPage } from '@/pages/DocsPage'
import { CommunityPage } from '@/pages/CommunityPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SnippetDetailPage } from '@/pages/SnippetDetailPage'
import { NewSnippetPage } from '@/pages/NewSnippetPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { VerifyEmailPage } from '@/pages/VerifyEmailPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const APP_LINKS = [
  { to: '/dashboard', label: 'My Snippets' },
  { to: '/community', label: 'Community' },
  { to: '/community', label: 'Explore' },
]

export default function App() {
  return (
    <Routes>
      {/* Public marketing pages */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Route>

      {/* Auth is a full-screen split, so it sits outside both shells */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Arrives from the verification email, so it stands alone too */}
      <Route element={<SiteLayout />}>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>

      {/* Community needs the app top bar but no sidebar */}
      <Route element={<AppLayout links={APP_LINKS} active="Community" appBar={false} sidebar={false} />}>
        <Route path="/community" element={<CommunityPage />} />
      </Route>

      {/* Authenticated app */}
      <Route element={<AppLayout links={APP_LINKS} active="My Snippets" />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/snippets/new" element={<NewSnippetPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route element={<AppLayout links={APP_LINKS} active="My Snippets" appBar={false} sidebar={false} wide />}>
        <Route path="/snippet/:id" element={<SnippetDetailPage />} />
      </Route>

      <Route element={<SiteLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}