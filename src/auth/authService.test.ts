import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TEST_EMAIL, TEST_JWT, TEST_PASSWORD, mockLogin } from '../test/mockLogin'
import {
  NOT_ALLOWED_MESSAGE,
  PASSWORD_URL,
  SESSION_KEY,
  changePassword,
  clearSession,
  loadSession,
  login,
  logout,
  passwordProblem,
  refreshSession,
} from './authService'
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
    expect(loadSession(2_000)).toEqual({
      email: TEST_EMAIL,
      authenticatedAt: 1_000,
      expiresAt: 1_000 + SESSION_DAYS * DAY,
      isAdmin: false,
      mustChangePassword: false,
    })
  })

  it('remembers whether the account is an admin and must change its password', async () => {
    mockLogin({ admin: true, mustChangePassword: true })

    const result = await login(TEST_EMAIL, TEST_PASSWORD)

    expect(result.ok && result.session).toMatchObject({ isAdmin: true, mustChangePassword: true })
    expect(loadSession()).toMatchObject({ isAdmin: true, mustChangePassword: true })
  })

  it('reads a login saved before accounts existed as a normal account', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: TEST_EMAIL, authenticatedAt: 1, expiresAt: Date.now() + 60_000 }))
    expect(loadSession()).toMatchObject({ email: TEST_EMAIL, isAdmin: false, mustChangePassword: false })
  })

  it('refreshes the account flags from the API, and returns null once the account is gone', async () => {
    mockLogin()
    const signedIn = await login(TEST_EMAIL, TEST_PASSWORD)
    if (!signedIn.ok) throw new Error('login failed')

    mockLogin({ mustChangePassword: true })
    expect(await refreshSession(signedIn.session)).toMatchObject({ mustChangePassword: true })
    expect(loadSession()?.mustChangePassword).toBe(true)

    mockLogin({ allowed: false })
    expect(await refreshSession(signedIn.session)).toBeNull()
  })

  it('changes the password, passing on the server reason when it refuses', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)

    await changePassword('a brand new one')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(PASSWORD_URL)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ new_password: 'a brand new one' })

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ detail: 'Too weak.' }), { status: 400 }))))
    await expect(changePassword('a brand new one')).rejects.toThrow('Too weak.')
  })

  it('checks a new password before sending it', () => {
    expect(passwordProblem('short', 'short')).toBe('Use at least 8 characters.')
    expect(passwordProblem(' padded pass', ' padded pass')).toBe('The password cannot start or end with a space.')
    expect(passwordProblem('é'.repeat(37), 'é'.repeat(37))).toBe('That password is too long (72 bytes at most).')
    expect(passwordProblem('long enough', 'long enougH')).toBe('The two passwords do not match.')
    expect(passwordProblem('long enough', 'long enough')).toBeNull()
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