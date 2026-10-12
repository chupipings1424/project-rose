// Project ROSE service worker. Its only job is notifications: it wakes up when the
// ROSE API sends a Web Push message, even if ROSE is closed.
// (No offline caching - ROSE needs your PC anyway.)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  // iOS requires a visible notification for every push, or it stops delivering them.
  event.waitUntil(
    self.registration.showNotification(data.title || 'ROSE reminder', {
      body: data.body || '',
      tag: data.tag || 'rose',
      renotify: true,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/projects/reminders' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/projects/reminders'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (open) {
        await open.focus()
        // The app's router handles the navigation (see src/lib/serviceWorker.ts).
        open.postMessage({ type: 'open', url })
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})