import { remindersApi } from '../api/client'

/**
 * Web Push in the browser. Browsers allow it only on https:// or localhost, so ROSE
 * offers it on the PC (http://localhost:5180). See LEARNING.md section 14.
 */
export type PushState = 'unsupported' | 'insecure' | 'install' | 'denied' | 'off' | 'on'

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

export async function getPushState(): Promise<PushState> {
  if (!window.isSecureContext) return 'insecure'
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!supported) return isIos() && !isStandalone() ? 'install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const subscription = await currentSubscription()
  if (subscription && Notification.permission === 'granted') {
    // Re-register quietly, in case the worker's data was reset.
    void remindersApi.subscribe(subscription.toJSON(), deviceLabel()).catch(() => undefined)
    return 'on'
  }
  return 'off'
}

/** VAPID keys travel as base64url text; the Push API wants raw bytes. */
function base64UrlToBytes(text: string): Uint8Array<ArrayBuffer> {
  const base64 = (text + '='.repeat((4 - (text.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function deviceLabel(): string {
  const ua = navigator.userAgent
  const device = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows PC' : 'Browser'
  return `${device} (${new Date().toLocaleDateString()})`
}

/** Must run straight from a tap: iOS only shows the permission prompt for a user gesture. */
export async function enablePush(): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications were not allowed. You can change this in Settings → Notifications → ROSE.')
  const registration = await navigator.serviceWorker.ready
  const { publicKey } = await remindersApi.pushKey()
  const key = base64UrlToBytes(publicKey)

  // An old subscription made with a different server key cannot be reused.
  const existing = await registration.pushManager.getSubscription()
  if (existing) await existing.unsubscribe()

  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  await remindersApi.subscribe(subscription.toJSON(), deviceLabel())
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription()
  if (!subscription) return
  await remindersApi.unsubscribe(subscription.endpoint).catch(() => undefined)
  await subscription.unsubscribe()
}