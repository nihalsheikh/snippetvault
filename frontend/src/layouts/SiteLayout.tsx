import { Outlet } from 'react-router-dom'
import { SiteNav } from '@/components/ui/Navigation'
import { SiteFooter } from '@/components/layout/SiteFooter'

export function SiteLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteNav />
      <Outlet />
      <SiteFooter />
    </div>
  )
}