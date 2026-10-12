import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemePicker } from './ThemePicker'
import { ThemeProvider } from './ThemeProvider'
import { THEMES } from './themes'

const renderPicker = (variant?: 'grid' | 'compact') =>
  render(
    <ThemeProvider>
      <ThemePicker variant={variant} />
    </ThemeProvider>,
  )

describe('ThemePicker', () => {
  afterEach(() => localStorage.clear())

  it('groups the themes into Futuristic and Anime', () => {
    renderPicker()
    const anime = screen.getByRole('group', { name: 'Anime' })
    const futuristic = screen.getByRole('group', { name: 'Futuristic' })
    for (const name of ['Hunter', 'Dragon Ball Super', 'Naruto', 'Bleach', 'Code Geass']) {
      expect(within(anime).getByRole('radio', { name: new RegExp(name) })).toBeInTheDocument()
    }
    expect(within(futuristic).getByRole('radio', { name: /Neon/ })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(THEMES.length)
  })

  it('switches the theme when a card is picked', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('radio', { name: /Code Geass/ }))
    expect(document.documentElement.dataset.theme).toBe('geass')
    expect(screen.getByRole('radio', { name: /Code Geass/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('uses option groups in the compact dropdown', () => {
    const { container } = renderPicker('compact')
    const labels = [...container.querySelectorAll('optgroup')].map((group) => group.label)
    expect(labels).toEqual(['Futuristic', 'Anime'])
    expect(screen.getByRole('option', { name: 'Bleach' })).toBeInTheDocument()
  })
})