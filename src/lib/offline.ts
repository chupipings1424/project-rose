import { useSyncExternalStore } from 'react'

/**
 * Offline mode (view only).
 *
 * public/sw.js keeps a copy of every successful GET /api/* answer. When the network
 * is gone it answers from that copy and adds the X-Rose-Offline header, so the app
 * can tell "fresh" from "saved earlier". ROSE counts as offline when the browser says
 * so OR the last answer came from the saved copy (e.g. the phone has signal but the
 * server can't be reached).
 *
 * useSyncExternalStore is React's hook for reading a value that lives outside React
 * (here: navigator.onLine + a module variable) and re-rendering when it changes.
 */
export const OFFLINE_HEADER = 'X-Rose-Offline'
/** Must match API_CACHE in public/sw.js. */
export const API_CACHE = 'rose-api-v1'
export const VIEW_ONLY_MESSAGE = "You're offline - ROSE is view-only until you reconnect."

let servedFromCache = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

/** apiFetch calls this with every response. */
export function noteResponse(response: Response): void {
  const cached = response.headers.get(OFFLINE_HEADER) === '1'
  if (cached === servedFromCache) return
  servedFromCache = cached
  notify()
}

export function isOffline(): boolean {
  return navigator.onLine === false || servedFromCache
}

function subscribe(listener: () => void): () => void {
  const onOnline = () => {
    servedFromCache = false
    notify()
  }
  listeners.add(listener)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', notify)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', notify)
  }
}

export function useOffline(): boolean {
  return useSyncExternalStore(subscribe, isOffline, () => false)
}

/** On log out: forget the saved answers so the next person on this phone can't read them. */
export async function clearOfflineData(): Promise<void> {
  servedFromCache = false
  if (typeof caches === 'undefined') return
  try {
    await caches.delete(API_CACHE)
  } catch {
    // private mode / unsupported: nothing was saved
  }
}