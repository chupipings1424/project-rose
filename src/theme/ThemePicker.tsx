import { THEMES, type ThemeId } from './themes'
import { useTheme } from './useTheme'

interface ThemePickerProps {
  /** "grid" shows big preview cards, "compact" is a small dropdown for the top bar. */
  variant?: 'grid' | 'compact'
}

export function ThemePicker({ variant = 'grid' }: ThemePickerProps) {
  const { theme, setTheme } = useTheme()

  if (variant === 'compact') {
    return (
      <label className="theme-compact" title="Change theme">
        <span className="sr-only">Theme</span>
        <span className="theme-compact-dot" aria-hidden="true" />
        <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeId)}>
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <div className="theme-grid" role="radiogroup" aria-label="Choose a theme">
      {THEMES.map((t) => {
        const [bg, a, b] = t.swatch
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={theme === t.id}
            className={`theme-card${theme === t.id ? ' is-active' : ''}`}
            onClick={() => setTheme(t.id)}
          >
            <span
              className="theme-swatch"
              style={{ background: `linear-gradient(135deg, ${a}, ${b})`, boxShadow: `inset 0 0 0 3px ${bg}` }}
              aria-hidden="true"
            />
            <span className="theme-name">{t.name}</span>
            <span className="theme-desc">{t.description}</span>
          </button>
        )
      })}
    </div>
  )
}