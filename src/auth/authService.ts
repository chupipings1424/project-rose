/**
 * Authentication rules live here, away from React, so they are easy to test
 * and easy to replace. Today the token is checked in the browser; later this
 * file can call a real server instead and nothing else has to change.
 *
 * NOTE: a token checked in the browser is a "front door lock", not real
 * security - anything in VITE_* variables ends up inside the JavaScript bundle.
 * See LEARNING.md -> "Authentication" for how to upgrade it.
 */

export const SESSION_KEY = 'rose.session'
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

export interface Session {
  authenticatedAt: number
  expiresAt: number
}

/** A discriminated union: check `result.ok` and TypeScript knows which fields exist. */
export type LoginResult = { ok: true; session: Session } | { ok: false; error: string }

function configuredToken(): string | undefined {
  const token = import.meta.env.VITE_ROSE_TOKEN?.trim()
  return token ? token : undefined
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.authenticatedAt === 'number' && typeof candidate.expiresAt === 'number'
}

export function loadSession(now: number = Date.now()): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isSession(parsed) || parsed.expiresAt <= now) {
      clearSession()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // nothing to clear
  }
}

// `async` on purpose: a future server check will need to await a fetch,
// and callers already handle a Promise today.
export async function login(token: string, now: number = Date.now()): Promise<LoginResult> {
  const expected = configuredToken()
  if (!expected) {
    return {
      ok: false,
      error: 'No access token is configured. Copy .env.example to .env and set VITE_ROSE_TOKEN.',
    }
  }
  const attempt = token.trim()
  if (!attempt) return { ok: false, error: 'Enter your access token.' }
  if (attempt !== expected) return { ok: false, error: 'Access denied - that token is not valid.' }

  const session: Session = { authenticatedAt: now, expiresAt: now + SESSION_TTL_MS }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return { ok: true, session }
}