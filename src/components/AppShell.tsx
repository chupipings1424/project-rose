import { lazy, Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import type { CommandDraft } from '../commands/draft'
import { clearOutbox, startOutboxSync, useOutbox } from '../lib/outbox'
import { QUICK_ADD_EVENT } from '../quickadd/openQuickAdd'
import { ThemePicker } from '../theme/ThemePicker'
import { Brand } from './Brand'
import { ConfirmDialog } from './ConfirmDialog'
import { OfflineBanner } from './OfflineBanner'
import { SyncStatus } from './SyncStatus'
import { UpdateBanner } from './UpdateBanner'

// Only downloaded the first time someone taps (+).
const QuickAddDialog = lazy(() => import('../quickadd/QuickAddDialog'))

/** What the (+) dialog was opened with: nothing (a blank form) or a command bar draft. */
type QuickAddState = { draft?: CommandDraft } | null

/** The frame around every logged-in page: top bar + the current route (<Outlet />) + quick add. */
export function AppShell() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const pending = useOutbox()
  // The Android home-screen shortcut (manifest.webmanifest) opens /today?quick=1.
  const [quickAdd, setQuickAdd] = useState<QuickAddState>(() =>
    new URLSearchParams(location.search).get('quick') === '1' ? {} : null,
  )
  const [confirmLogout, setConfirmLogout] = useState(false)

  // Send saves that waited offline: now, when back online, and when ROSE comes to the front.
  useEffect(() => startOutboxSync(), [])

  // The command bar's "Edit" on any page opens quick add filled in.
  useEffect(() => {
    const onOpen = (event: Event) => setQuickAdd({ draft: (event as CustomEvent<CommandDraft | undefined>).detail })
    window.addEventListener(QUICK_ADD_EVENT, onOpen)
    return () => window.removeEventListener(QUICK_ADD_EVENT, onOpen)
  }, [])

  // Drop ?quick=1 so a reload doesn't open the dialog again.
  const quickParam = new URLSearchParams(location.search).get('quick')
  useEffect(() => {
    if (quickParam !== '1') return
    const params = new URLSearchParams(location.search)
    params.delete('quick')
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
  }, [quickParam, location.pathname, location.search, navigate])

  function finishLogout() {
    setConfirmLogout(false)
    void clearOutbox()
    logout()
    navigate('/login', { replace: true })
  }

  function handleLogout() {
    // Unsent saves belong to this account: warn before they are deleted.
    if (pending.length > 0) setConfirmLogout(true)
    else finishLogout()
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
        <SyncStatus />
        <UpdateBanner />
      </header>
      <main className="page">
        <Outlet />
      </main>
      {/* Also offline: saves wait on the phone (lib/outbox.ts). */}
      <button type="button" className="fab no-print" aria-label="Quick add" title="Quick add" onClick={() => setQuickAdd({})}>
        +
        {pending.length > 0 && (
          <span className="fab-badge" aria-label={`${pending.length} waiting to sync`}>
            {pending.length}
          </span>
        )}
      </button>
      {quickAdd && (
        <Suspense fallback={null}>
          <QuickAddDialog draft={quickAdd.draft} onClose={() => setQuickAdd(null)} />
        </Suspense>
      )}
      <ConfirmDialog
        open={confirmLogout}
        title="Log out and delete unsynced saves?"
        confirmLabel="Delete them and log out"
        onConfirm={finishLogout}
        onCancel={() => setConfirmLogout(false)}
      >
        <p>
          {pending.length} {pending.length === 1 ? 'save is' : 'saves are'} still waiting on this phone and haven&apos;t
          reached the server. Logging out deletes {pending.length === 1 ? 'it' : 'them'}.
        </p>
        <p className="muted small">Tip: cancel, get online and let them sync first.</p>
      </ConfirmDialog>
    </div>
  )
}