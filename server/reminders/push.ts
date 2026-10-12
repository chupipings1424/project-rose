import webpush, { type PushSubscription, type SendResult } from 'web-push'
import type { JsonFile } from './jsonFile.ts'

export interface VapidKeys {
  publicKey: string
  privateKey: string
}

export interface PushDevice {
  subscription: PushSubscription
  label: string
  createdAt: string
}

export interface PushMessage {
  title: string
  body: string
  /** Page to open when the notification is tapped. */
  url: string
  /** Same tag = the new notification replaces the old one instead of stacking. */
  tag: string
}

type Sender = (subscription: PushSubscription, payload: string, options: webpush.RequestOptions) => Promise<SendResult>

/**
 * VAPID keys identify *this* server to Apple's / Google's push services. They
 * are created once and saved next to the data (git-ignored). Losing them only
 * means every phone has to tap "Enable notifications" again.
 */
export function loadVapidKeys(file: JsonFile<VapidKeys>): VapidKeys {
  const existing = file.readExisting()
  if (existing?.publicKey && existing.privateKey) return existing
  const keys = webpush.generateVAPIDKeys()
  file.write(keys)
  return keys
}

export function isPushSubscription(value: unknown): value is PushSubscription {
  const sub = value as PushSubscription | null
  return (
    typeof sub?.endpoint === 'string' &&
    sub.endpoint.startsWith('https://') &&
    typeof sub.keys?.p256dh === 'string' &&
    typeof sub.keys?.auth === 'string'
  )
}

/** Remembers which devices subscribed and sends them Web Push messages. */
export class PushService {
  readonly publicKey: string
  private readonly file: JsonFile<PushDevice[]>
  private readonly options: webpush.RequestOptions
  private readonly send: Sender
  private devices: PushDevice[]

  constructor(file: JsonFile<PushDevice[]>, vapid: VapidKeys, contact: string, send: Sender = webpush.sendNotification) {
    this.file = file
    this.publicKey = vapid.publicKey
    this.send = send
    // TTL: if the phone is offline, the push service keeps trying for 6 hours.
    this.options = {
      TTL: 6 * 60 * 60,
      urgency: 'high',
      vapidDetails: { subject: contact, publicKey: vapid.publicKey, privateKey: vapid.privateKey },
    }
    this.devices = file.read()
  }

  get count(): number {
    return this.devices.length
  }

  subscribe(subscription: PushSubscription, label: string, now = new Date()): void {
    this.devices = this.devices.filter((d) => d.subscription.endpoint !== subscription.endpoint)
    this.devices.push({ subscription, label: label.slice(0, 120), createdAt: now.toISOString() })
    this.file.write(this.devices)
  }

  unsubscribe(endpoint: string): void {
    this.devices = this.devices.filter((d) => d.subscription.endpoint !== endpoint)
    this.file.write(this.devices)
  }

  /** Sends to every device. Devices the push service says are gone (404/410) are forgotten. */
  async sendToAll(message: PushMessage): Promise<{ sent: number; failed: number }> {
    const payload = JSON.stringify(message)
    let sent = 0
    let failed = 0
    const gone = new Set<string>()
    await Promise.all(
      this.devices.map(async ({ subscription }) => {
        try {
          await this.send(subscription, payload, this.options)
          sent++
        } catch (error) {
          failed++
          const status = (error as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) gone.add(subscription.endpoint)
          else console.error(`[push] ${status ?? ''} ${(error as Error).message}`)
        }
      }),
    )
    if (gone.size) {
      this.devices = this.devices.filter((d) => !gone.has(d.subscription.endpoint))
      this.file.write(this.devices)
    }
    return { sent, failed }
  }
}