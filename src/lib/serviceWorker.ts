import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Registers public/sw.js. Browsers only allow service workers on https:// or
 * localhost, so on a plain http:// LAN address this quietly does nothing.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return
  navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
    console.warn('ROSE: service worker registration failed', error)
  })
}

interface OpenMessage {
  type: 'open'
  url: string
}

function isOpenMessage(data: unknown): data is OpenMessage {
  return typeof data === 'object' && data !== null && (data as OpenMessage).type === 'open' && typeof (data as OpenMessage).url === 'string'
}

/** When you tap a notification while ROSE is already open, the service worker asks us to navigate. */
export function useServiceWorkerNavigation(): void {
  const navigate = useNavigate()
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent) => {
      if (isOpenMessage(event.data) && event.data.url.startsWith('/')) navigate(event.data.url)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [navigate])
}