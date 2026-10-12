// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Reminder } from '../../shared/reminders.ts'
import { JsonFile } from './jsonFile.ts'
import { convertLegacyTasks } from './legacyImport.ts'
import { PushService, type PushDevice } from './push.ts'
import { NotFoundError, ReminderService } from './ReminderService.ts'

const dirs: string[] = []
function tempFile<T>(name: string, fallback: () => T) {
  const dir = mkdtempSync(path.join(tmpdir(), 'rose-reminders-'))
  dirs.push(dir)
  return new JsonFile<T>(path.join(dir, name), fallback)
}
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

const now = new Date('2026-10-12T01:00:00.000Z')
const input = { text: 'Stretch', dueAt: '2026-10-12T02:00:00.000Z', repeat: 'none' as const }

describe('ReminderService', () => {
  it('saves to disk and loads it back', () => {
    const file = tempFile<Reminder[]>('reminders.json', () => [])
    const created = new ReminderService(file).create(input, now)
    expect(new ReminderService(file).list()).toEqual([created])
  })

  it('snooze silences it and sets the next ring time', () => {
    const service = new ReminderService(tempFile<Reminder[]>('r.json', () => []))
    const { id } = service.create(input, now)
    service.tick(new Date('2026-10-12T02:00:00.000Z'))
    const snoozed = service.snooze(id, 10, new Date('2026-10-12T02:01:00.000Z'))
    expect(snoozed).toMatchObject({ ringing: false, snoozedUntil: '2026-10-12T02:11:00.000Z' })
    expect(() => service.snooze(id, 0)).toThrow(RangeError)
  })

  it('complete finishes one-offs but only silences repeating ones', () => {
    const service = new ReminderService(tempFile<Reminder[]>('r.json', () => []))
    const once = service.create(input, now)
    const daily = service.create({ ...input, repeat: 'daily' }, now)
    expect(service.complete(once.id).done).toBe(true)
    expect(service.complete(daily.id)).toMatchObject({ done: false, ringing: false })
  })

  it('changing the time lets a rung reminder ring again', () => {
    const service = new ReminderService(tempFile<Reminder[]>('r.json', () => []))
    const { id } = service.create(input, now)
    service.tick(new Date('2026-10-12T02:00:00.000Z'))
    const edited = service.update(id, { ...input, dueAt: '2026-10-12T03:00:00.000Z' })
    expect(edited).toMatchObject({ firedFor: null, ringing: false })
  })

  it('throws NotFoundError for unknown ids', () => {
    const service = new ReminderService(tempFile<Reminder[]>('r.json', () => []))
    expect(() => service.remove('nope')).toThrow(NotFoundError)
  })
})

describe('PushService', () => {
  const vapid = { publicKey: 'pub', privateKey: 'priv' }
  const subscription = (n: number) => ({ endpoint: `https://web.push.apple.com/${n}`, keys: { p256dh: 'p', auth: 'a' } })

  it('sends to every device and forgets the ones that are gone', async () => {
    const file = tempFile<PushDevice[]>('devices.json', () => [])
    const send = vi.fn(async (sub: { endpoint: string }, _payload: string) => {
      if (sub.endpoint.endsWith('/2')) throw Object.assign(new Error('Gone'), { statusCode: 410 })
      return { statusCode: 201, body: '', headers: {} }
    })
    const push = new PushService(file, vapid, 'mailto:me@example.com', send)
    push.subscribe(subscription(1), 'iPhone')
    push.subscribe(subscription(2), 'old iPad')
    push.subscribe(subscription(1), 'iPhone again') // same endpoint replaces, no duplicate

    const result = await push.sendToAll({ title: 't', body: 'b', url: '/', tag: 'x' })

    expect(result).toEqual({ sent: 1, failed: 1 })
    expect(JSON.parse(send.mock.calls[0][1])).toEqual({ title: 't', body: 'b', url: '/', tag: 'x' })
    expect(push.count).toBe(1)
    expect(file.read().map((d) => d.label)).toEqual(['iPhone again'])
  })
})

describe('convertLegacyTasks (old To-Do & Alarms app)', () => {
  it('keeps timed tasks and does not re-ring old ones', () => {
    const converted = convertLegacyTasks(
      [
        { id: 'a', text: 'Presentation', done: false, dueAt: '2026-08-20T05:00:00.000Z', fired: false, createdAt: 1 },
        { id: 'b', text: 'Future', done: false, dueAt: '2026-12-01T05:00:00.000Z', fired: false },
        { id: 'c', text: 'No time', done: false, dueAt: null },
      ],
      now,
    )
    expect(converted.map((r) => [r.id, r.firedFor !== null])).toEqual([
      ['a', true],
      ['b', false],
    ])
    expect(converted[0]).toMatchObject({ repeat: 'none', ringing: false, createdAt: '1970-01-01T00:00:00.001Z' })
  })
})