// Project ROSE service worker.
//
// 1. Notifications: wakes up when the ROSE API sends a Web Push message, even if
//    ROSE is closed.
// 2. Offline mode (view only):
//    - the app itself (index.html + the built JS/CSS) is saved so ROSE opens without
//      a connection. The build writes precache.json listing those files.
//    - every successful GET /api/* answer is saved; when the network is gone the saved
//      copy is returned with an "X-Rose-Offline: 1" header (src/lib/offline.ts shows a
//      banner and blocks saving).
//    - log in/out and anything that is not a GET always go to the network.
//    The app clears the saved API answers on log out (other people may use this phone).

const SHELL_CACHE = 'rose-shell-v1'
const API_CACHE = 'rose-api-v1' // keep in sync with src/lib/offline.ts
const OFFLINE_HEADER = 'X-Rose-Offline'

// Live answers only: auth, the server clock and file downloads.
const NEVER_CACHE = [/^\/api\/auth\//, /\/now$/, /\/download$/, /\/import\//, /\/push\//]

/** Saves index.html and every built file, and drops files from older builds. */
async function precache() {
  const cache = await caches.open(SHELL_CACHE)
  let files = []
  try {
    const response = await fetch('/precache.json', { cache: 'no-store' })
    if (response.ok) files = await response.json()
  } catch {
    return // offline or dev server: try again next start
  }
  const wanted = new Set(['/index.html', ...files.map((file) => `/${file}`)])
  await Promise.all(
    [...wanted].map(async (path) => {
      if (path !== '/index.html' && (await cache.match(path))) return // hashed: never changes
      try {
        const response = await fetch(path, { cache: 'no-store' })
        if (response.ok) await cache.put(path, response)
      } catch {
        // skip; it is fetched again next time
      }
    }),
  )
  for (const request of await cache.keys()) {
    if (!wanted.has(new URL(request.url).pathname)) await cache.delete(request)
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(precache())
})
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// The app asks for a refresh on every start, so a new deploy is saved for offline use too.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'precache') event.waitUntil(precache())
})

function markOffline(response) {
  const headers = new Headers(response.headers)
  headers.set(OFFLINE_HEADER, '1')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

/** Network first; when that fails, the last saved answer. */
async function apiRequest(request) {
  const cache = await caches.open(API_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request.url, response.clone())
    return response
  } catch (error) {
    const saved = await cache.match(request.url)
    if (saved) return markOffline(saved)
    throw error
  }
}

/** Pages: network first, then the saved index.html (React Router takes it from there). */
async function pageRequest(request) {
  try {
    return await fetch(request)
  } catch (error) {
    const saved = await caches.match('/index.html', { cacheName: SHELL_CACHE })
    if (saved) return saved
    throw error
  }
}

/** Built files have a hash in their name, so a saved copy is always right. */
async function assetRequest(request) {
  const cache = await caches.open(SHELL_CACHE)
  const saved = await cache.match(request.url)
  if (saved) return saved
  const response = await fetch(request)
  if (response.ok) await cache.put(request.url, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(pageRequest(request))
  } else if (url.pathname.startsWith('/api/')) {
    if (NEVER_CACHE.some((pattern) => pattern.test(url.pathname))) return
    event.respondWith(apiRequest(request))
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(assetRequest(request))
  }
})

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