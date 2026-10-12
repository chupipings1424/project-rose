import { createContext } from 'react'
import type { LoginResult, Session } from './authService'

export interface AuthContextValue {
  session: Session | null
  isAuthenticated: boolean
  login: (token: string) => Promise<LoginResult>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)