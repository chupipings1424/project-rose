import { NavLink, Outlet } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { trackerApi } from './api/client'
import { trackerPaths } from './paths'

const TABS = [
  { to: trackerPaths.overview, label: 'Overview', end: true },
  { to: trackerPaths.payments, label: 'Payments', end: false },
  { to: trackerPaths.budget, label: 'Budget', end: false },
  { to: trackerPaths.report, label: 'Report', end: false },
]

export function TrackerLayout() {
  // A cheap "is the backend alive?" ping.
  const health = useAsync(() => trackerApi.now(), [])

  return (
    <div className="tracker">
      <div className="tracker-head no-print">
        <div>
          <p className="eyebrow">Project 01</p>
          <h1 className="display tracker-title">Payment Tracker</h1>
        </div>
        <nav className="subnav" aria-label="Payment tracker">
          {TABS.map((tab) => (
            <NavLink key={tab.label} to={tab.to} end={tab.end}>
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <a className="btn ghost" href={trackerApi.downloadUrl}>
          ⤓ Download Excel
        </a>
      </div>

      {health.error && (
        <div className="banner banner-error no-print" role="alert">
          <span>{health.error.message}</span>
          <button type="button" className="btn ghost" onClick={health.reload}>
            Retry
          </button>
        </div>
      )}

      <Outlet />
    </div>
  )
}