/**
 * Login rules live here, away from React, so they are easy to test.
 *
 * The token is checked by the ROSE API (never in the browser): the API compares
 * it in constant time and answers with a signed session token (a JWT) that
 * every later request sends back. See LEARNING.md -> "Authentication".
 */
import { OFFLINE_MESSAGE, errorMessage } from '../api/http'
import { saveSession, type Session } from './session'

export { SESSION_KEY, clearSession, loadSession, type Session } from './session'

export const LOGIN_URL = '/api/auth/login'

/** A discriminated union: check `result.ok` and TypeScript knows which fields exist. */
export type LoginResult = { ok: true; session: Session } | { ok: false; error: string }

/** What POST /api/auth/login answers (the API uses snake_case JSON). */
interface LoginResponse {
  access_token: string
  token_type: string
  expires_at: string
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.access_token === 'string' && typeof candidate.expires_at === 'string'
}

export async function login(token: string, now: number = Date.now()): Promise<LoginResult> {
  const attempt = token.trim()
  if (!attempt) return { ok: false, error: 'Enter your access token.' }

  let response: Response
  try {
    response = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: attempt }),
    })
  } catch {
    return { ok: false, error: OFFLINE_MESSAGE }
  }

  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    // 401 = wrong token, 429 = too many attempts; both come with a readable `detail`.
    return { ok: false, error: errorMessage(body) ?? (response.status >= 500 ? OFFLINE_MESSAGE : 'Login failed.') }
  }
  if (!isLoginResponse(body)) return { ok: false, error: OFFLINE_MESSAGE }

  const session: Session = {
    accessToken: body.access_token,
    authenticatedAt: now,
    expiresAt: Date.parse(body.expires_at),
  }
  saveSession(session)
  return { ok: true, session }
}