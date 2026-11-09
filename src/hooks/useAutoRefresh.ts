import { useEffect } from 'react'
import { DATA_CHANGED_EVENT } from '../lib/dataEvents'

/**
 * Keeps a page fresh without a manual refresh. Calls `reload`:
 *   - after quick add (or anything else) announces a change (lib/dataEvents.ts)
 *   - when you come back to ROSE (switching apps on the phone, another browser tab)
 *
 * `reload` must be stable (useAsync's reload is), or the listeners are re-added every render.
 */
export function useAutoRefresh(reload: () => void): void {
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    window.addEventListener(DATA_CHANGED_EVENT, reload)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, reload)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])
}