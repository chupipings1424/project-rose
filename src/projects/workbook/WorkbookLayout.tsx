import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { CurrencyPicker } from '../../currency/CurrencyPicker'
import { useAsync } from '../../hooks/useAsync'
import { workbookApi } from './api/client'

export interface WorkbookTab {
  to: string
  label: string
  /** true for the project's home tab, so it is not "active" on every sub-page */
  end?: boolean
}

interface WorkbookLayoutProps {
  eyebrow: string
  title: string
  tabs: readonly WorkbookTab[]
}

/**
 * The frame shared by the Payment Tracker and Budget projects: title, tabs,
 * the currency picker (only money projects need it), "Download Excel" and an
 * "is the API alive?" banner. Each project passes its
 * own title and tabs; the page itself renders in <Outlet/>.
 */
export function WorkbookLayout({ eyebrow, title, tabs }: WorkbookLayoutProps) {
  const health = useAsync(() => workbookApi.now(), [])
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function download() {
    setDownloading(true)
    setDownloadError(null)
    try {
      await workbookApi.download()
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Download failed.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="tracker">
      <div className="tracker-head no-print">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display tracker-title">{title}</h1>
        </div>
        <nav className="subnav" aria-label={title}>
          {tabs.map((tab) => (
            <NavLink key={tab.label} to={tab.to} end={tab.end ?? false}>
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className="tracker-actions">
          <CurrencyPicker />
          <button type="button" className="btn ghost" onClick={() => void download()} disabled={downloading}>
            ⤓ Download Excel
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="banner banner-error no-print" role="alert">
          <span>{downloadError}</span>
        </div>
      )}

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