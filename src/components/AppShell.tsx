import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { CurrencyPicker } from '../currency/CurrencyPicker'
import { ThemePicker } from '../theme/ThemePicker'
import { Brand } from './Brand'

/** The frame around every logged-in page: top bar + the current route (<Outlet />). */
export function AppShell() {
  const { logout } = useAuth()
  const navigate = useNavigate()

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
          </nav>
          <div className="topbar-actions">
            <CurrencyPicker />
            <ThemePicker variant="compact" />
            <button type="button" className="btn ghost" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}