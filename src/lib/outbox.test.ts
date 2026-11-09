import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newSession, saveSession } from '../auth/session'
import { DATA_CHANGED_EVENT } from './dataEvents'

// No real Supabase in tests: every request just gets a token.
vi.mock('../auth/supabase', () => ({ accessToken: vi.fn(() => Promise.resolve('test-token')) }))
import {
  clearOutbox,
  flushOutbox,
  memoryStorage,
  OUTBOX_SYNCED_EVENT,
  removeEntry,
  retryEntry,
  setOutboxStorage,
  submit,
  type OutboxRequest,
  type OutboxStorage,
} from './outbox'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

const request = (label: string): OutboxRequest => ({ kind: 'expense', label, url: '/api/test', body: { label } })
const keyOf = (call: unknown[]) => new Headers((call[1] as RequestInit).headers).get('Idempotency-Key')
const login = (email: string) => saveSession(newSession(email, { isAdmin: false, mustChangePassword: false }))

describe('outbox', () => {
  let storage: OutboxStorage
  let online = true
  const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => json({ ok: true }))

  beforeEach(() => {
    storage = memoryStorage()
    setOutboxStorage(storage)
    online = true
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
    vi.stubGlobal('fetch', fetchMock)
    login('me@rose.test')
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    fetchMock.mockReset()
    fetchMock.mockImplementation(() => json({ ok: true }))
  })

  async function queueOffline(...labels: string[]) {
    online = false
    for (const label of labels) expect(await submit(request(label))).toEqual({ status: 'queued' })
    online = true
  }

  it('sends right away when online', async () => {
    expect(await submit(request('kape'))).toEqual({ status: 'sent', body: { ok: true } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(keyOf(fetchMock.mock.calls[0])).toBeTruthy()
    expect(await storage.all()).toHaveLength(0)
  })

  it('keeps saves made offline and sends them later with the same key, oldest first', async () => {
    await queueOffline('first', 'second')
    expect(fetchMock).not.toHaveBeenCalled()
    const keys = (await storage.all()).map((entry) => entry.id)
    const synced = vi.fn()
    const changed = vi.fn()
    window.addEventListener(OUTBOX_SYNCED_EVENT, synced)
    window.addEventListener(DATA_CHANGED_EVENT, changed)

    await flushOutbox()

    window.removeEventListener(OUTBOX_SYNCED_EVENT, synced)
    window.removeEventListener(DATA_CHANGED_EVENT, changed)
    expect(fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)).label)).toEqual(['first', 'second'])
    expect(fetchMock.mock.calls.map(keyOf)).toEqual(expect.arrayContaining(keys))
    expect(await storage.all()).toHaveLength(0)
    expect((synced.mock.calls[0][0] as CustomEvent<number>).detail).toBe(2)
    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('stops at a network error and keeps everything that is left', async () => {
    await queueOffline('first', 'second')
    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))

    await flushOutbox()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await storage.all()).toHaveLength(2)
  })

  it('keeps it when the server is down or the login ended', async () => {
    await queueOffline('first')
    fetchMock.mockImplementationOnce(() => json({}, 503))
    await flushOutbox()
    fetchMock.mockImplementationOnce(() => json({}, 401))
    login('me@rose.test') // a 401 logs out; log in again
    await flushOutbox()
    expect(await storage.all()).toHaveLength(1)
  })

  it('marks a refused entry, moves on, and can retry it', async () => {
    await queueOffline('bad', 'good')
    fetchMock.mockImplementationOnce(() => json({ detail: 'Title not found' }, 404))

    await flushOutbox()

    const [left] = await storage.all()
    expect(left).toMatchObject({ label: 'bad', error: 'Title not found' })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await retryEntry(left.id)
    expect(await storage.all()).toHaveLength(0)
  })

  it('does not throw a refused save into the queue when online', async () => {
    fetchMock.mockImplementationOnce(() => json({ detail: 'Amount must be more than 0' }, 400))
    await expect(submit(request('zero'))).rejects.toThrow('Amount must be more than 0')
    expect(await storage.all()).toHaveLength(0)
  })

  it("never sends another account's saves", async () => {
    await queueOffline('mine')
    login('someone@rose.test')

    await flushOutbox()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(await storage.all()).toHaveLength(1)
  })

  it('deletes one entry, or all of them on log out', async () => {
    await queueOffline('a', 'b', 'c')
    const [first] = await storage.all()
    await removeEntry(first.id)
    expect(await storage.all()).toHaveLength(2)

    await clearOutbox()
    expect(await storage.all()).toHaveLength(0)
  })
})