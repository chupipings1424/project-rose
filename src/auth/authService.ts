/**
 * Login rules live here, away from React, so they are easy to test.
 *
 *   1. Supabase Auth checks the email and password and returns a session (JWT).
 *   2. ROSE's API is asked whether that account may use ROSE (the allow-list lives
 *      on the server, so nobody can skip it by editing the browser code).
 *   3. We remember the login for 30 days.
 *
 * See LEARNING.md -> "Authentication".
 */
import type { AuthError } from '@supabase/supabase-js'
import { OFFLINE_MESSAGE } from '../api/http'
import { clearSession, newSession, saveSession, type Session } from './session'
import { getSupabase } from './supabase'

export { SESSION_KEY, clearSession, loadSession, type Session } from './session'

export const SESSION_CHECK_URL = '/api/auth/session'
export const NOT_ALLOWED_MESSAGE = 'This account is not allowed to use ROSE.'

/** A discriminated union: check `result.ok` and TypeScript knows which fields exist. */
export type LoginResult = { ok: true; session: Session } | { ok: false; error: string }

// Checked by name/code (not instanceof helpers) so supabase-js stays out of the main bundle.
function loginError(error: AuthError): string {
  if (error.name === 'AuthRetryableFetchError') return 'Cannot reach the login service - check your internet connection.'
  if (error.code === 'invalid_credentials') return 'Wrong email or password.'
  if (error.status === 429) return 'Too many attempts - wait a minute and try again.'
  return error.message || 'Login failed.'
}

export async function login(email: string, password: string, now: number = Date.now()): Promise<LoginResult> {
  const address = email.trim()
  if (!address || !password) return { ok: false, error: 'Enter your email and password.' }

  let supabase
  try {
    supabase = await getSupabase()
  } catch {
    return { ok: false, error: OFFLINE_MESSAGE }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: address, password })
  if (error || !data.session) return { ok: false, error: error ? loginError(error) : 'Login failed.' }

  let check: Response | undefined
  try {
    check = await fetch(SESSION_CHECK_URL, { headers: { Authorization: `Bearer ${data.session.access_token}` } })
  } catch {
    // handled below
  }
  if (!check?.ok) {
    await supabase.auth.signOut({ scope: 'local' })
    return { ok: false, error: check?.status === 403 ? NOT_ALLOWED_MESSAGE : OFFLINE_MESSAGE }
  }

  const session = newSession(data.user.email ?? address, now)
  saveSession(session)
  return { ok: true, session }
}

/** Forgets the login here and drops the Supabase session on this device. */
export async function logout(): Promise<void> {
  clearSession()
  try {
    await (await getSupabase()).auth.signOut({ scope: 'local' })
  } catch {
    // offline: the local tokens are dropped next time the client loads
  }
}