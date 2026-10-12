/**
 * Where the login session is remembered (localStorage), kept apart from the
 * login logic so the HTTP helper can read the token without importing auth.
 */

export const SESSION_KEY = 'rose.session'

export interface Session {
  /** The signed session token (a JWT) the API gave us. Sent as `Authorization: Bearer ...`. */
  accessToken: string
  authenticatedAt: number
  expiresAt: number
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.accessToken === 'string' &&
    typeof candidate.authenticatedAt === 'number' &&
    typeof candidate.expiresAt === 'number'
  )
}

export function loadSession(now: number = Date.now()): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    // Sessions from older versions (no accessToken) are dropped too: just log in again.
    if (!isSession(parsed) || parsed.expiresAt <= now) {
      clearSession()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // nothing to clear
  }
}