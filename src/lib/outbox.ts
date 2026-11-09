/**
 * The outbox: saves that could not reach the server wait here and are sent later.
 *
 * Quick add and the command bar call `submit()`. Online, it sends right away. Offline
 * (no signal in the basement parking lot), or when the server can't be reached, the
 * entry is kept on this phone in IndexedDB - the browser's small built-in database that
 * survives closing the app - and `flushOutbox()` sends it the next time ROSE is opened
 * or the phone is back online.
 *
 * Every entry has an id that is also sent as the `Idempotency-Key` header. If the
 * server saved an entry but the answer got lost on the way back, sending it again
 * returns the first answer instead of saving it twice (see the API's [Idempotent]).
 *
 * iPhones have no "Background Sync" for web apps, so sending happens while ROSE is open.
 */
import { useSyncExternalStore } from 'react'
import { ApiError, apiFetch, readJson } from '../api/http'
import { loadSession } from '../auth/session'
import { announceDataChanged } from './dataEvents'

export type OutboxKind = 'payment' | 'expense' | 'reminder'

/** One save, described as data so it can wait in storage. Always a POST with a JSON body. */
export interface OutboxRequest {
  kind: OutboxKind
  /** Shown in the "waiting to sync" list, e.g. "Expense · Kape · ₱50.00". */
  label: string
  url: string
  body: unknown
}

export interface OutboxEntry extends OutboxRequest {
  /** Also the Idempotency-Key, so a retry can never save twice. */
  id: string
  /** Who saved it: another account logging in on this phone must not send it. */
  owner: string
  createdAt: number
  /** The server refused it (e.g. the title was deleted). Kept so you can see why and delete it. */
  error?: string
}

export type SubmitResult<T = unknown> = { status: 'sent'; body: T } | { status: 'queued' }

/** Fired on `window` after waiting entries were sent; `detail` is how many. */
export const OUTBOX_SYNCED_EVENT = 'rose:outbox-synced'

/** Where entries are kept. IndexedDB on phones, plain memory in tests (jsdom has no IndexedDB). */
export interface OutboxStorage {
  all(): Promise<OutboxEntry[]>
  put(entry: OutboxEntry): Promise<void>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

const DB_NAME = 'rose-outbox'
const STORE = 'entries'
/** A phone with "bars but no data" can leave a request hanging; give up and keep it. */
const SEND_TIMEOUT_MS = 10_000

function indexedDbStorage(): OutboxStorage {
  let opening: Promise<IDBDatabase> | null = null
  const open = () =>
    (opening ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        opening = null
        reject(request.error ?? new Error('Could not open the outbox'))
      }
    }))

  // IndexedDB speaks events, not promises. This wraps one request in one transaction and
  // resolves when the transaction is committed (so a "saved" entry really is on disk).
  const run = <T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) =>
    open().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const transaction = db.transaction(STORE, mode)
          const request = work(transaction.objectStore(STORE))
          transaction.oncomplete = () => resolve(request.result)
          transaction.onerror = transaction.onabort = () =>
            reject(transaction.error ?? request.error ?? new Error('Outbox storage failed'))
        }),
    )

  return {
    all: () => run('readonly', (store) => store.getAll() as IDBRequest<OutboxEntry[]>),
    put: async (entry) => {
      await run('readwrite', (store) => store.put(entry))
    },
    remove: async (id) => {
      await run('readwrite', (store) => store.delete(id))
    },
    clear: async () => {
      await run('readwrite', (store) => store.clear())
    },
  }
}

export function memoryStorage(): OutboxStorage {
  const saved = new Map<string, OutboxEntry>()
  return {
    all: async () => [...saved.values()].map((entry) => ({ ...entry })),
    put: async (entry) => {
      saved.set(entry.id, { ...entry })
    },
    remove: async (id) => {
      saved.delete(id)
    },
    clear: async () => {
      saved.clear()
    },
  }
}

const defaultStorage = (): OutboxStorage => (typeof indexedDB === 'undefined' ? memoryStorage() : indexedDbStorage())

let storage = defaultStorage()
let entries: OutboxEntry[] = []
let loading: Promise<void> | null = null
let flushing: Promise<void> | null = null
const listeners = new Set<() => void>()

function publish(next: OutboxEntry[]) {
  entries = [...next].sort((a, b) => a.createdAt - b.createdAt)
  listeners.forEach((listener) => listener())
}

function load(): Promise<void> {
  return (loading ??= storage.all().then(publish, () => publish([])))
}

/** Tests: start from an empty outbox with the given storage. */
export function setOutboxStorage(next: OutboxStorage): void {
  storage = next
  entries = []
  loading = null
  flushing = null
}

const currentOwner = () => loadSession()?.email.trim().toLowerCase() ?? ''

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

/** Network trouble, server down or logged out: worth trying again later. */
function canRetryLater(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true
  return error.status === 0 || error.status === 401 || error.status === 408 || error.status === 429 || error.status >= 500
}

async function send<T>(entry: OutboxEntry): Promise<T> {
  const response = await apiFetch(
    entry.url,
    {
      method: 'POST',
      body: JSON.stringify(entry.body),
      headers: { 'Idempotency-Key': entry.id },
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(SEND_TIMEOUT_MS) : undefined,
    },
    { allowOffline: true },
  )
  return readJson<T>(response)
}

/**
 * Save now if possible, otherwise keep it for later. Throws only when the server
 * refused the entry (e.g. "amount must be more than 0") so the form can show why.
 */
export async function submit<T = unknown>(request: OutboxRequest): Promise<SubmitResult<T>> {
  await load()
  const entry: OutboxEntry = { ...request, id: newId(), owner: currentOwner(), createdAt: Date.now() }
  if (navigator.onLine !== false) {
    try {
      const body = await send<T>(entry)
      announceDataChanged()
      void flushOutbox()
      return { status: 'sent', body }
    } catch (error) {
      if (!canRetryLater(error)) throw error
    }
  }
  await storage.put(entry)
  publish([...entries, entry])
  return { status: 'queued' }
}

async function drain(owner: string) {
  // Re-read: another tab may have sent (and removed) some of them already.
  publish(await storage.all())
  let sent = 0
  for (const entry of entries.filter((e) => e.owner === owner && !e.error)) {
    try {
      await send(entry)
    } catch (error) {
      if (canRetryLater(error)) break
      const refused = { ...entry, error: (error as Error).message }
      await storage.put(refused)
      publish(entries.map((e) => (e.id === refused.id ? refused : e)))
      continue
    }
    await storage.remove(entry.id)
    publish(entries.filter((e) => e.id !== entry.id))
    sent += 1
  }
  if (sent > 0) {
    announceDataChanged()
    window.dispatchEvent(new CustomEvent(OUTBOX_SYNCED_EVENT, { detail: sent }))
  }
}

async function runFlush() {
  await load()
  const owner = currentOwner()
  if (navigator.onLine === false || !owner) return
  // Web Locks: if ROSE is open in two tabs, only one of them sends.
  const locks = typeof navigator.locks?.request === 'function' ? navigator.locks : null
  if (!locks) return drain(owner)
  await locks.request('rose-outbox', { ifAvailable: true }, async (lock) => {
    if (lock) await drain(owner)
  })
}

/** Send everything that is waiting (one at a time, oldest first). Safe to call often. */
export function flushOutbox(): Promise<void> {
  return (flushing ??= runFlush()
    .catch(() => undefined)
    .finally(() => {
      flushing = null
    }))
}

/** Delete one waiting entry without sending it. */
export async function removeEntry(id: string): Promise<void> {
  await storage.remove(id)
  publish(entries.filter((e) => e.id !== id))
}

/** Clear a refused entry's error and try it again. */
export async function retryEntry(id: string): Promise<void> {
  const entry = entries.find((e) => e.id === id)
  if (!entry) return
  const retried: OutboxEntry = { ...entry, error: undefined }
  await storage.put(retried)
  publish(entries.map((e) => (e.id === id ? retried : e)))
  await flushOutbox()
}

/** On log out: nothing from this account should stay on the phone. */
export async function clearOutbox(): Promise<void> {
  await storage.clear()
  publish([])
}

/** Sends on start, when the phone is back online and whenever ROSE comes back to the front. */
export function startOutboxSync(): () => void {
  const kick = () => void flushOutbox()
  const onVisible = () => {
    if (document.visibilityState === 'visible') kick()
  }
  window.addEventListener('online', kick)
  document.addEventListener('visibilitychange', onVisible)
  kick()
  return () => {
    window.removeEventListener('online', kick)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

// useSyncExternalStore needs the same array back until something changes, so the
// "mine only" list is remembered per (entries, owner).
let snapshot = { source: entries, owner: '', mine: [] as OutboxEntry[] }
function pendingSnapshot(): OutboxEntry[] {
  const owner = currentOwner()
  if (snapshot.source !== entries || snapshot.owner !== owner) {
    snapshot = { source: entries, owner, mine: entries.filter((e) => e.owner === owner) }
  }
  return snapshot.mine
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  void load()
  return () => listeners.delete(listener)
}

const noEntries: OutboxEntry[] = []

/** This account's entries waiting to sync (oldest first). */
export function useOutbox(): OutboxEntry[] {
  return useSyncExternalStore(subscribe, pendingSnapshot, () => noEntries)
}