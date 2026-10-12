/**
 * The one door between the browser and the ROSE API (the .NET backend in the
 * project-rose-api repo). Every request goes through `apiFetch`, which:
 *
 *   - adds `Authorization: Bearer <session token>`
 *   - turns "server not running" into a friendly message
 *   - logs you out everywhere when the API answers 401 (session expired)
 *
 * Vite forwards /api/* to the API in development (see vite.config.ts).
 */
import { clearSession, loadSession } from '../auth/session'

/** Fired on `window` when the API rejects our session; AuthProvider listens and logs out. */
export const UNAUTHORIZED_EVENT = 'rose:unauthorized'

export const OFFLINE_MESSAGE = 'Cannot reach the ROSE API. Start ROSE with "npm start".'
export const SESSION_ENDED_MESSAGE = 'Your session has ended - please log in again.'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * The human-readable message in an error body. The .NET API sends RFC 7807
 * "problem details" (`detail`); `error` is kept for any older `{ error }` body.
 */
export function errorMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const { detail, error } = body as { detail?: unknown; error?: unknown }
  if (typeof detail === 'string' && detail) return detail
  if (typeof error === 'string' && error) return error
  return undefined
}

/** `fetch` plus the session token. Throws ApiError when offline or logged out. */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const session = loadSession()
  if (session) headers.set('Authorization', `Bearer ${session.accessToken}`)
  // FormData sets its own multipart Content-Type (with the boundary), so only label JSON bodies.
  if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(url, { ...init, headers })
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0)
  }

  if (response.status === 401) {
    clearSession()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    throw new ApiError(SESSION_ENDED_MESSAGE, 401)
  }
  return response
}

/** Reads a JSON response, or throws ApiError with the server's own message. */
export async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  let body: unknown = undefined
  try {
    body = text ? JSON.parse(text) : undefined
  } catch {
    // not JSON - usually the dev proxy saying the API is down
  }

  if (!response.ok) {
    const message = errorMessage(body)
    if (!message && response.status >= 500) throw new ApiError(OFFLINE_MESSAGE, response.status)
    throw new ApiError(message ?? `Request failed (${response.status})`, response.status)
  }
  if (body === undefined) throw new ApiError(OFFLINE_MESSAGE, response.status)
  return body as T
}

/** GET/POST/... JSON with the session token. */
export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  return readJson<T>(await apiFetch(url, init))
}

/** "attachment; filename=payments.xlsx" -> "payments.xlsx" */
function fileNameFrom(disposition: string | null): string | undefined {
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  return match ? decodeURIComponent(match[1]) : undefined
}

/**
 * Downloads a protected file. A plain <a href> cannot send the Authorization
 * header, so we fetch the bytes and hand the browser a temporary blob: URL.
 */
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  const response = await apiFetch(url)
  if (!response.ok) await readJson(response) // throws with the server's message
  const blob = await response.blob()
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = fileNameFrom(response.headers.get('Content-Disposition')) ?? fallbackName
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before freeing the memory.
  setTimeout(() => URL.revokeObjectURL(href), 1_000)
}