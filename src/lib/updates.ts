import { useEffect, useState } from 'react'

/** This copy of ROSE. */
export const BUILD_ID = __BUILD_ID__

/** How often an open app checks for a newer deploy (it also checks whenever you come back to it). */
export const UPDATE_CHECK_MS = 30 * 60 * 1000

/** The build id the server has right now, or null when it can't be read (offline, dev server). */
export async function fetchLatestBuildId(): Promise<string | null> {
  try {
    // no-store: always ask the server, never a cached copy.
    const response = await fetch('/version.json', { cache: 'no-store' })
    if (!response.ok) return null
    const body = (await response.json()) as { id?: unknown }
    return typeof body.id === 'string' ? body.id : null
  } catch {
    return null
  }
}

/**
 * True once a newer ROSE has been deployed than the one running. A home-screen app can
 * stay open for days, so without this you would keep using the old version.
 */
export function useUpdateAvailable(enabled: boolean = import.meta.env.PROD): boolean {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const check = () => {
      void fetchLatestBuildId().then((id) => {
        if (!cancelled && id && id !== BUILD_ID) setAvailable(true)
      })
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    const timer = window.setInterval(check, UPDATE_CHECK_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])

  return available
}