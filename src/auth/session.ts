/**
 * Remembers *who* is logged in and *until when*, kept apart from the login logic
 * so the HTTP helper can check it without importing auth.
 *
 * The tokens themselves are kept by the Supabase client (see supabase.ts). This
 * small record adds ROSE's own rule on top: a login lasts 30 days, then you sign
 * in again. localStorage (not sessionStorage), so it survives closing the browser
 * and works for the installed app (PWA) on your phone.
 */

export const SESSION_KEY = 'rose.login'
export const SESSION_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export interface Session {
  email: string
  authenticatedAt: number
  expiresAt: number
  /** Can open the Users page (decided by the API, which also protects the page itself). */
  isAdmin: boolean
  /** Signed in with a temporary password: must choose their own before using ROSE. */
  mustChangePassword: boolean
}

/** What the API says about the account (GET /api/auth/session). */
export interface AccountFlags {
  isAdmin: boolean
  mustChangePassword: boolean
}

export function newSession(email: string, flags: AccountFlags, now: number = Date.now()): Session {
  return { email, authenticatedAt: now, expiresAt: now + SESSION_DAYS * DAY_MS, ...flags }
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.email === 'string' &&
    typeof candidate.authenticatedAt === 'number' &&
    typeof candidate.expiresAt === 'number'
  )
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
    // Saved before accounts existed: no flags yet. AuthProvider asks the API again on start.
    return { ...parsed, isAdmin: parsed.isAdmin === true, mustChangePassword: parsed.mustChangePassword === true }
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