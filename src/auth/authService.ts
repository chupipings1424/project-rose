/**
 * Login rules live here, away from React, so they are easy to test.
 *
 *   1. Supabase Auth checks the email and password and returns a session (JWT).
 *   2. ROSE's API is asked whether that login has a ROSE account, and whether it is
 *      an admin or still has a temporary password (decided on the server, so nobody
 *      can skip it by editing the browser code).
 *   3. We remember the login for 30 days.
 *
 * See LEARNING.md -> "Authentication".
 */
import type { AuthError } from '@supabase/supabase-js'
import { OFFLINE_MESSAGE, apiFetch, readJson } from '../api/http'
import { clearSession, newSession, saveSession, type AccountFlags, type Session } from './session'
import { getSupabase } from './supabase'

export { SESSION_KEY, clearSession, loadSession, type Session } from './session'

export const SESSION_CHECK_URL = '/api/auth/session'
export const PASSWORD_URL = '/api/auth/password'
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

  const session = newSession(data.user.email ?? address, await accountFlags(check), now)
  saveSession(session)
  return { ok: true, session }
}

interface SessionDto {
  is_admin?: boolean
  must_change_password?: boolean
}

async function accountFlags(response: Response): Promise<AccountFlags> {
  const body = (await response.json().catch(() => ({}))) as SessionDto
  return { isAdmin: body.is_admin === true, mustChangePassword: body.must_change_password === true }
}

/**
 * Asks the API again who we are (the admin may have reset our password, or removed the
 * account since we signed in). Returns the updated session, or null when the account is gone.
 * Throws ApiError when offline, so a flaky connection never signs anybody out.
 */
export async function refreshSession(session: Session): Promise<Session | null> {
  const response = await apiFetch(SESSION_CHECK_URL)
  if (response.status === 403) return null
  if (!response.ok) await readJson(response)
  const updated = { ...session, ...(await accountFlags(response)) }
  saveSession(updated)
  return updated
}

export const PASSWORD_MIN_LENGTH = 8

/** Rules the API checks too; checking here first just gives a quicker answer. */
export function passwordProblem(password: string, confirmation: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  if (password.trim() !== password) return 'The password cannot start or end with a space.'
  if (new TextEncoder().encode(password).length > 72) return 'That password is too long (72 bytes at most).'
  if (password !== confirmation) return 'The two passwords do not match.'
  return null
}

/** Replaces a temporary password with your own. */
export async function changePassword(newPassword: string): Promise<void> {
  const response = await apiFetch(PASSWORD_URL, { method: 'POST', body: JSON.stringify({ new_password: newPassword }) })
  if (!response.ok) await readJson(response) // throws with the server's message
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