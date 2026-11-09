import { lazy, Suspense, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useOffline } from '../lib/offline'
import { ThemePicker } from '../theme/ThemePicker'
import { Brand } from './Brand'
import { OfflineBanner } from './OfflineBanner'
import { UpdateBanner } from './UpdateBanner'

// Only downloaded the first time someone taps (+).
const QuickAddDialog = lazy(() => import('../quickadd/QuickAddDialog'))

/** The frame around every logged-in page: top bar + the current route (<Outlet />) + quick add. */
export function AppShell() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const offline = useOffline()
  const [quickAdd, setQuickAdd] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Brand />
          <nav className="topnav">
            <NavLink to="/projects" end>
              Projects
            </NavLink>
            <NavLink to="/today">Today</NavLink>
            {session?.isAdmin && <NavLink to="/admin/users">Users</NavLink>}
          </nav>
          <div className="topbar-actions">
            <ThemePicker variant="compact" />
            <NavLink to="/change-password" className="btn ghost" title={session?.email}>
              Password
            </NavLink>
            <button type="button" className="btn ghost" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
        <OfflineBanner />
        <UpdateBanner />
      </header>
      <main className="page">
        <Outlet />
      </main>
      {/* View only while offline, so there is nothing to add. */}
      {!offline && (
        <button type="button" className="fab no-print" aria-label="Quick add" title="Quick add" onClick={() => setQuickAdd(true)}>
          +
        </button>
      )}
      {quickAdd && (
        <Suspense fallback={null}>
          <QuickAddDialog onClose={() => setQuickAdd(false)} />
        </Suspense>
      )}
    </div>
  )
}