import { createContext } from 'react'
import type { ThemeId } from './themes'

export interface ThemeContextValue {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  /** false = the animated backgrounds stand still (saved per browser). */
  motion: boolean
  setMotion: (motion: boolean) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)