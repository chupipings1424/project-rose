import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_KEY, clearSession, loadSession, login } from './authService'
import { mockLoginApi, TEST_TOKEN } from '../test/mockLoginApi'

describe('authService', () => {
  beforeEach(() => mockLoginApi())
  afterEach(() => vi.unstubAllGlobals())

  it('sends the token to the API and stores the session it returns', async () => {
    const result = await login(TEST_TOKEN, 1_000)

    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }))
    expect(loadSession(2_000)).toEqual({
      accessToken: 'session-jwt',
      authenticatedAt: 1_000,
      expiresAt: Date.parse('2099-01-01T00:00:00.000Z'),
    })
  })

  it('trims surrounding whitespace before sending', async () => {
    expect((await login(`  ${TEST_TOKEN}  `)).ok).toBe(true)
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(init?.body))).toEqual({ token: TEST_TOKEN })
  })

  it('shows the API message for a wrong token and stores nothing', async () => {
    const result = await login('nope')

    expect(result).toEqual({ ok: false, error: 'Access denied - that token is not valid.' })
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('rejects an empty token without calling the API', async () => {
    expect(await login('   ')).toEqual({ ok: false, error: 'Enter your access token.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('explains when the API is not running', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

    const result = await login(TEST_TOKEN)

    expect(!result.ok && result.error).toMatch(/Cannot reach the ROSE API/)
  })

  it('drops an expired session', async () => {
    await login(TEST_TOKEN)

    expect(loadSession(Date.parse('2099-01-01T00:00:00.001Z'))).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('drops sessions saved by older versions (no access token)', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ authenticatedAt: 1, expiresAt: Date.now() + 60_000 }))
    expect(loadSession()).toBeNull()
  })

  it('ignores corrupted session data', () => {
    localStorage.setItem(SESSION_KEY, '{not json')
    expect(loadSession()).toBeNull()
  })

  it('clears the session on logout', async () => {
    await login(TEST_TOKEN)
    clearSession()
    expect(loadSession()).toBeNull()
  })
})