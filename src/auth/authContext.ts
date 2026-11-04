import { createContext } from 'react'
import type { LoginResult, Session } from './authService'

export interface AuthContextValue {
  session: Session | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
  /** Choose your own password (after signing in with a temporary one). Throws ApiError. */
  changePassword: (newPassword: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)