import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseReminderInput } from '../../shared/reminders.ts'
import { isPushSubscription, type PushService } from './push.ts'
import { NotFoundError, type ReminderService } from './ReminderService.ts'

/** Every route lives under this prefix; Vite proxies it here (see vite.config.ts). */
export const API_PREFIX = '/api/reminders'

class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
  })
  res.end(text)
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 100_000) throw new HttpError(413, 'Request body too large.')
  }
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw new HttpError(400, 'Body is not valid JSON.')
  }
}

interface Deps {
  reminders: ReminderService
  push: PushService
  nativeAlarms: boolean
  sendTest: () => Promise<{ sent: number; failed: number }>
}

/**
 * The HTTP layer: match a route, validate input, call the service, send JSON.
 * Built on plain node:http to show what frameworks like Express do for you.
 */
export function createHandler({ reminders, push, nativeAlarms, sendTest }: Deps) {
  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const route = url.pathname.replace(/\/+$/, '')
    const method = req.method ?? 'GET'

    try {
      if (!route.startsWith(API_PREFIX)) throw new HttpError(404, 'Not found.')
      const path = route.slice(API_PREFIX.length) || '/'

      if (path === '/status' && method === 'GET') {
        return send(res, 200, { ok: true, devices: push.count, nativeAlarms, now: new Date().toISOString() })
      }

      if (path === '/items') {
        if (method === 'GET') return send(res, 200, reminders.list())
        if (method === 'POST') {
          const input = parseReminderInput(await readJson(req))
          if (!input.ok) throw new HttpError(400, input.error)
          return send(res, 201, reminders.create(input.value))
        }
      }

      // /items/:id and /items/:id/<action>
      const item = /^\/items\/([\w-]+)(?:\/(complete|dismiss|snooze))?$/.exec(path)
      if (item) {
        const [, id, action] = item
        if (!action && method === 'PATCH') {
          const input = parseReminderInput(await readJson(req))
          if (!input.ok) throw new HttpError(400, input.error)
          return send(res, 200, reminders.update(id, input.value))
        }
        if (!action && method === 'DELETE') {
          reminders.remove(id)
          return send(res, 200, { ok: true })
        }
        if (action === 'complete' && method === 'POST') return send(res, 200, reminders.complete(id))
        if (action === 'dismiss' && method === 'POST') return send(res, 200, reminders.dismiss(id))
        if (action === 'snooze' && method === 'POST') {
          const { minutes } = (await readJson(req)) as { minutes?: unknown }
          return send(res, 200, reminders.snooze(id, Number(minutes ?? 10)))
        }
      }

      if (path === '/push/key' && method === 'GET') return send(res, 200, { publicKey: push.publicKey })

      if (path === '/push/subscribe' && method === 'POST') {
        const { subscription, label } = (await readJson(req)) as { subscription?: unknown; label?: unknown }
        if (!isPushSubscription(subscription)) throw new HttpError(400, 'Invalid push subscription.')
        push.subscribe(subscription, typeof label === 'string' ? label : 'Unknown device')
        return send(res, 200, { ok: true, devices: push.count })
      }

      if (path === '/push/unsubscribe' && method === 'POST') {
        const { endpoint } = (await readJson(req)) as { endpoint?: unknown }
        if (typeof endpoint !== 'string') throw new HttpError(400, 'Missing endpoint.')
        push.unsubscribe(endpoint)
        return send(res, 200, { ok: true, devices: push.count })
      }

      if (path === '/push/test' && method === 'POST') {
        const result = await sendTest()
        if (result.sent === 0) {
          throw new HttpError(409, push.count ? 'Every device refused the test - enable notifications again.' : 'No device has notifications enabled yet.')
        }
        return send(res, 200, result)
      }

      throw new HttpError(404, 'Not found.')
    } catch (error) {
      if (error instanceof HttpError) return send(res, error.status, { error: error.message })
      if (error instanceof NotFoundError) return send(res, 404, { error: error.message })
      if (error instanceof RangeError) return send(res, 400, { error: error.message })
      console.error('[reminders]', error)
      return send(res, 500, { error: 'Something went wrong in the reminders server.' })
    }
  }
}