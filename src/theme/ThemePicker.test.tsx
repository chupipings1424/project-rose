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

  it('groups the themes into Futuristic, Modern and Retro', () => {
    renderPicker()
    const futuristic = screen.getByRole('group', { name: 'Futuristic' })
    for (const name of ['Neon', 'Deep Space', 'Matrix', 'Solar Flare', 'Hologram']) {
      expect(within(futuristic).getByRole('radio', { name: new RegExp(name) })).toBeInTheDocument()
    }
    const modern = screen.getByRole('group', { name: 'Modern' })
    for (const name of ['Midnight Calm', 'Rose Dusk', 'Nordic Frost', 'Paper Sage']) {
      expect(within(modern).getByRole('radio', { name: new RegExp(name) })).toBeInTheDocument()
    }
    const retro = screen.getByRole('group', { name: 'Retro' })
    expect(within(retro).getByRole('radio', { name: /Retro 8-bit/ })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(THEMES.length)
  })

  it('switches the theme when a card is picked', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('radio', { name: /Retro 8-bit/ }))
    expect(document.documentElement.dataset.theme).toBe('retro')
    expect(screen.getByRole('radio', { name: /Retro 8-bit/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('uses option groups in the compact dropdown', () => {
    const { container } = renderPicker('compact')
    const labels = [...container.querySelectorAll('optgroup')].map((group) => group.label)
    expect(labels).toEqual(['Futuristic', 'Modern', 'Retro'])
    expect(screen.getByRole('option', { name: 'Retro 8-bit' })).toBeInTheDocument()
  })

  it('marks the theme group on <html> so the Modern look applies', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('radio', { name: /Nordic Frost/ }))
    expect(document.documentElement.dataset.theme).toBe('frost')
    expect(document.documentElement.dataset.themeGroup).toBe('modern')
  })
})