import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext } from './themeContext'
import { DEFAULT_THEME, MOTION_STORAGE_KEY, THEME_STORAGE_KEY, isThemeId, themeGroupOf, type ThemeId } from './themes'

function readSavedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeId(saved) ? saved : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

function readSavedMotion(): boolean {
  try {
    return localStorage.getItem(MOTION_STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Passing a function to useState means it only runs on the first render.
  const [theme, setTheme] = useState<ThemeId>(readSavedTheme)
  const [motion, setMotion] = useState<boolean>(readSavedMotion)

  // Side effect: whenever the theme changes, update <html data-theme> (+ data-theme-group, so CSS can
  // style a whole group at once, e.g. the calm Modern look) and remember it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.themeGroup = themeGroupOf(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // storage can be unavailable (private mode) - the theme still works for this visit
    }
  }, [theme])

  // <html data-motion="off"> pauses every CSS animation in the background (see global.css).
  useEffect(() => {
    if (motion) delete document.documentElement.dataset.motion
    else document.documentElement.dataset.motion = 'off'
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, motion ? 'on' : 'off')
    } catch {
      // see above
    }
  }, [motion])

  const value = useMemo(() => ({ theme, setTheme, motion, setMotion }), [theme, motion])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}