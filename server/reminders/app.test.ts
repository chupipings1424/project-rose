// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Reminder } from '../../shared/reminders.ts'
import { createHandler } from './app.ts'
import { JsonFile } from './jsonFile.ts'
import { PushService, type PushDevice } from './push.ts'
import { ReminderService } from './ReminderService.ts'

// A real HTTP server on a random port: tests the routes exactly as Vite's proxy calls them.
let server: Server
let base: string
const dir = mkdtempSync(path.join(tmpdir(), 'rose-api-'))

beforeAll(async () => {
  const reminders = new ReminderService(new JsonFile<Reminder[]>(path.join(dir, 'r.json'), () => []))
  const push = new PushService(new JsonFile<PushDevice[]>(path.join(dir, 'd.json'), () => []), { publicKey: 'PUBLIC', privateKey: 'x' }, 'mailto:a@b.c')
  server = createServer(createHandler({ reminders, push, nativeAlarms: false, sendTest: () => push.sendToAll({ title: '', body: '', url: '/', tag: 't' }) }))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/reminders`
})
afterAll(() => {
  server.close()
  rmSync(dir, { recursive: true, force: true })
})

const call = async (path: string, method = 'GET', body?: unknown) => {
  const res = await fetch(base + path, { method, body: body === undefined ? undefined : JSON.stringify(body) })
  // Loosely typed on purpose: each test asserts the shape it expects.
  return { status: res.status, body: (await res.json()) as Record<string, any> }
}

describe('reminders API', () => {
  it('creates, edits, snoozes and deletes a reminder', async () => {
    const created = await call('/items', 'POST', { text: 'Water plants', dueAt: '2030-01-01T00:00:00Z', repeat: 'daily' })
    expect(created.status).toBe(201)
    const id = created.body.id as string

    expect((await call(`/items/${id}`, 'PATCH', { text: 'Water the plants', dueAt: '2030-01-01T00:00:00Z' })).body.text).toBe('Water the plants')
    expect((await call(`/items/${id}/snooze`, 'POST', { minutes: 5 })).body.snoozedUntil).toBeTruthy()
    expect((await call('/items')).body).toHaveLength(1)
    expect((await call(`/items/${id}`, 'DELETE')).status).toBe(200)
    expect((await call(`/items/${id}`, 'DELETE')).status).toBe(404)
  })

  it('answers bad input with a readable 400', async () => {
    expect(await call('/items', 'POST', { text: '' })).toEqual({ status: 400, body: { error: 'Write what to remind you about.' } })
  })

  it('handles push subscriptions', async () => {
    expect((await call('/push/key')).body).toEqual({ publicKey: 'PUBLIC' })
    expect((await call('/push/subscribe', 'POST', { subscription: { endpoint: 'http://insecure' } })).status).toBe(400)
    expect((await call('/push/test', 'POST')).body.error).toMatch(/No device/)
    const ok = await call('/push/subscribe', 'POST', { subscription: { endpoint: 'https://web.push.apple.com/x', keys: { p256dh: 'p', auth: 'a' } }, label: 'iPhone' })
    expect(ok.body).toEqual({ ok: true, devices: 1 })
    expect((await call('/status')).body).toMatchObject({ ok: true, devices: 1 })
  })

  it('404s unknown routes', async () => {
    expect((await call('/nope')).status).toBe(404)
  })
})