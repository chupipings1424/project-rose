import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext } from './themeContext'
import { DEFAULT_THEME, THEMES, THEME_STORAGE_KEY, isThemeId, type ThemeId } from './themes'

function readSavedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeId(saved) ? saved : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Passing a function to useState means it only runs on the first render.
  const [theme, setTheme] = useState<ThemeId>(readSavedTheme)

  // Side effect: whenever the theme changes, update <html data-theme> (+ data-theme-group, so CSS can
  // style a whole group at once, e.g. the calm Modern look) and remember it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.themeGroup = THEMES.find((t) => t.id === theme)?.group
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // storage can be unavailable (private mode) - the theme still works for this visit
    }
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}