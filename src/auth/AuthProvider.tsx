import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { UNAUTHORIZED_EVENT } from '../api/http'
import { AuthContext } from './authContext'
import * as auth from './authService'
import { saveSession } from './session'

const MAX_TIMER_MS = 2_147_483_647

/** Loaded only when someone logs out, so the reminders code stays out of the login page. */
async function forgetThisDevice() {
  const { forgetThisDevice } = await import('../projects/reminders/lib/push')
  await forgetThisDevice()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<auth.Session | null>(() => auth.loadSession())

  const login = useCallback(async (email: string, password: string) => {
    const result = await auth.login(email, password)
    if (result.ok) setSession(result.session)
    return result
  }, [])

  // The token is already gone: just forget the login here.
  const endSession = useCallback(() => {
    void auth.logout()
    setSession(null)
  }, [])

  // You chose to log out: also stop this device's notifications first (needs the token).
  const logout = useCallback(() => {
    setSession(null)
    void forgetThisDevice()
      .catch(() => undefined)
      .then(() => auth.logout())
  }, [])

  const changePassword = useCallback(async (newPassword: string) => {
    await auth.changePassword(newPassword)
    setSession((current) => {
      if (!current) return current
      const updated = { ...current, mustChangePassword: false }
      saveSession(updated)
      return updated
    })
  }, [])

  // Ask the API once per start who we are: the admin may have reset the password or
  // removed the account. Offline? Keep the saved session and try next time.
  const signedInAs = session?.email
  useEffect(() => {
    const current = auth.loadSession()
    if (!signedInAs || !current) return
    let cancelled = false
    auth.refreshSession(current).then(
      (updated) => {
        if (cancelled) return
        if (updated) setSession(updated)
        else endSession()
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [signedInAs, endSession])

  // Log out automatically when the 30 days are up while the app is open.
  useEffect(() => {
    if (!session) return
    // Browsers fire at once for delays above 2^31-1 ms (~24.8 days), so cap the wait;
    // the effect simply runs again after the next reload.
    const delay = Math.min(Math.max(session.expiresAt - Date.now(), 0), MAX_TIMER_MS)
    if (delay === MAX_TIMER_MS) return
    const timer = window.setTimeout(endSession, delay)
    return () => window.clearTimeout(timer) // cleanup runs before the next effect / on unmount
  }, [session, endSession])

  // The API rejected our token (signed out elsewhere, or the account was removed).
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, endSession)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, endSession)
  }, [endSession])

  const value = useMemo(
    () => ({ session, isAuthenticated: session !== null, login, logout, changePassword }),
    [session, login, logout, changePassword],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}