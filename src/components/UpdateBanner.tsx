import { useUpdateAvailable } from '../lib/updates'

/** "A new version is ready" strip. Reloading fetches the new index.html (the service worker asks the network first). */
export function UpdateBanner({ enabled }: { enabled?: boolean }) {
  const available = useUpdateAvailable(enabled)
  if (!available) return null
  return (
    <button type="button" className="update-banner" onClick={() => window.location.reload()}>
      A new version of ROSE is ready - tap to reload
    </button>
  )
}