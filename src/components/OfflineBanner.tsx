import { useOffline } from '../lib/offline'

/** A thin strip under the top bar while ROSE shows saved (offline) data. */
export function OfflineBanner() {
  const offline = useOffline()
  if (!offline) return null
  return (
    <div className="offline-banner" role="status">
      <span aria-hidden="true">●</span> Offline - showing the last saved data. Changes are paused until you reconnect.
    </div>
  )
}