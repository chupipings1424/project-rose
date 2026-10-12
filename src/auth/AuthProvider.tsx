import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { UNAUTHORIZED_EVENT } from '../api/http'
import { AuthContext } from './authContext'
import * as auth from './authService'

const MAX_TIMER_MS = 2_147_483_647

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<auth.Session | null>(() => auth.loadSession())

  const login = useCallback(async (token: string) => {
    const result = await auth.login(token)
    if (result.ok) setSession(result.session)
    return result
  }, [])

  const logout = useCallback(() => {
    auth.clearSession()
    setSession(null)
  }, [])

  // Log out automatically when the session expires while the app is open.
  useEffect(() => {
    if (!session) return
    // Browsers fire at once for delays above 2^31-1 ms (~24.8 days), so cap the wait.
    const delay = Math.min(Math.max(session.expiresAt - Date.now(), 0), MAX_TIMER_MS)
    const timer = window.setTimeout(logout, delay)
    return () => window.clearTimeout(timer) // cleanup runs before the next effect / on unmount
  }, [session, logout])

  // The API rejected our session (expired, or the API was restarted with a new key).
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout)
  }, [logout])

  const value = useMemo(
    () => ({ session, isAuthenticated: session !== null, login, logout }),
    [session, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}