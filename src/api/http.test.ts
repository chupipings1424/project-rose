import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_KEY, saveSession } from '../auth/session'
import { UNAUTHORIZED_EVENT, apiFetch, errorMessage, requestJson } from './http'

const respond = (status: number, body: string) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(body, { status }))))

describe('http', () => {
  beforeEach(() => saveSession({ accessToken: 'jwt-123', authenticatedAt: 0, expiresAt: Date.now() + 60_000 }))
  afterEach(() => vi.unstubAllGlobals())

  it('sends the session token and labels JSON bodies', async () => {
    respond(200, '{}')

    await apiFetch('/api/x', { method: 'POST', body: '{}' })

    const headers = vi.mocked(fetch).mock.calls[0][1]!.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer jwt-123')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('logs out everywhere when the API answers 401', async () => {
    respond(401, '')
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)

    await expect(apiFetch('/api/x')).rejects.toThrow(/session has ended/)

    expect(listener).toHaveBeenCalledOnce()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })

  it('uses the problem-details message from the API', async () => {
    respond(409, JSON.stringify({ title: 'Conflict', status: 409, detail: "'Rent' already exists." }))
    await expect(requestJson('/api/x')).rejects.toThrow("'Rent' already exists.")
  })

  it('reports an offline API when the proxy answers with HTML', async () => {
    respond(502, '<html>Bad gateway</html>')
    await expect(requestJson('/api/x')).rejects.toThrow(/Cannot reach the ROSE API/)
  })

  it('reads detail first, then error', () => {
    expect(errorMessage({ detail: 'a', error: 'b' })).toBe('a')
    expect(errorMessage({ error: 'b' })).toBe('b')
    expect(errorMessage('nope')).toBeUndefined()
  })
})