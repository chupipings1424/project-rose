import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TEST_EMAIL, TEST_JWT, TEST_PASSWORD, mockLogin } from '../test/mockLogin'
import { NOT_ALLOWED_MESSAGE, SESSION_KEY, clearSession, loadSession, login, logout } from './authService'
import { SESSION_DAYS } from './session'
import { getSupabase } from './supabase'

vi.mock('./supabase')

const DAY = 24 * 60 * 60 * 1000

describe('authService', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('signs in with Supabase, checks the account with ROSE and remembers it for 30 days', async () => {
    const { fetchMock } = mockLogin()

    const result = await login(`  ${TEST_EMAIL} `, TEST_PASSWORD, 1_000)

    expect(result.ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/session')
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${TEST_JWT}`)
    expect(loadSession(2_000)).toEqual({ email: TEST_EMAIL, authenticatedAt: 1_000, expiresAt: 1_000 + SESSION_DAYS * DAY })
  })

  it('explains a wrong email or password', async () => {
    mockLogin()

    const result = await login(TEST_EMAIL, 'nope')

    expect(result).toEqual({ ok: false, error: 'Wrong email or password.' })
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('refuses an account ROSE does not allow, and signs it out of Supabase again', async () => {
    const { auth } = mockLogin({ allowed: false })

    const result = await login(TEST_EMAIL, TEST_PASSWORD)

    expect(result).toEqual({ ok: false, error: NOT_ALLOWED_MESSAGE })
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(loadSession()).toBeNull()
  })

  it('needs both fields before calling anyone', async () => {
    const { auth } = mockLogin()

    expect(await login(' ', TEST_PASSWORD)).toEqual({ ok: false, error: 'Enter your email and password.' })
    expect(await login(TEST_EMAIL, '')).toEqual({ ok: false, error: 'Enter your email and password.' })
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('reports an unreachable server when the config cannot be loaded', async () => {
    vi.mocked(getSupabase).mockRejectedValue(new Error('offline'))

    const result = await login(TEST_EMAIL, TEST_PASSWORD)

    expect(!result.ok && result.error).toMatch(/Cannot reach ROSE/)
  })

  it('forgets the login after 30 days', async () => {
    mockLogin()
    await login(TEST_EMAIL, TEST_PASSWORD, 0)

    expect(loadSession(SESSION_DAYS * DAY - 1)).not.toBeNull()
    expect(loadSession(SESSION_DAYS * DAY)).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('keeps the login in localStorage, so it survives closing the browser', async () => {
    mockLogin()
    await login(TEST_EMAIL, TEST_PASSWORD)
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull()
  })

  it('ignores junk and old-style records', () => {
    localStorage.setItem(SESSION_KEY, '{not json')
    expect(loadSession()).toBeNull()
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: 'x', authenticatedAt: 1, expiresAt: Date.now() + 60_000 }))
    expect(loadSession()).toBeNull()
  })

  it('logout forgets the login and signs out of Supabase on this device', async () => {
    const { auth } = mockLogin()
    await login(TEST_EMAIL, TEST_PASSWORD)

    await logout()

    expect(loadSession()).toBeNull()
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('clearSession is safe when nothing is stored', () => {
    clearSession()
    expect(loadSession()).toBeNull()
  })
})