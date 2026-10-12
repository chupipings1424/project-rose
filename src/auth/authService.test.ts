import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_KEY, SESSION_TTL_MS, clearSession, loadSession, login } from './authService'

describe('authService', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_ROSE_TOKEN', 'test-token-123')
  })

  it('accepts the configured token and stores a session', async () => {
    const result = await login('test-token-123', 1_000)

    expect(result.ok).toBe(true)
    expect(loadSession(2_000)).toEqual({ authenticatedAt: 1_000, expiresAt: 1_000 + SESSION_TTL_MS })
  })

  it('ignores surrounding whitespace', async () => {
    expect((await login('  test-token-123  ')).ok).toBe(true)
  })

  it('rejects a wrong token without creating a session', async () => {
    const result = await login('nope')

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/denied/i) })
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('rejects an empty token', async () => {
    expect(await login('   ')).toEqual({ ok: false, error: 'Enter your access token.' })
  })

  it('explains when no token is configured', async () => {
    vi.stubEnv('VITE_ROSE_TOKEN', '')
    const result = await login('anything')

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toMatch(/VITE_ROSE_TOKEN/)
  })

  it('drops an expired session', async () => {
    await login('test-token-123', 0)

    expect(loadSession(SESSION_TTL_MS + 1)).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('ignores corrupted session data', () => {
    localStorage.setItem(SESSION_KEY, '{not json')
    expect(loadSession()).toBeNull()
  })

  it('clears the session on logout', async () => {
    await login('test-token-123')
    clearSession()
    expect(loadSession()).toBeNull()
  })
})