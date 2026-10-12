import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from './authContext'
import * as auth from './authService'

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
    const timer = window.setTimeout(logout, Math.max(session.expiresAt - Date.now(), 0))
    return () => window.clearTimeout(timer) // cleanup runs before the next effect / on unmount
  }, [session, logout])

  const value = useMemo(
    () => ({ session, isAuthenticated: session !== null, login, logout }),
    [session, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}