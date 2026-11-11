import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemePicker } from './ThemePicker'
import { ThemeProvider } from './ThemeProvider'
import { MOTION_STORAGE_KEY, THEMES } from './themes'

const renderPicker = (variant?: 'grid' | 'compact') =>
  render(
    <ThemeProvider>
      <ThemePicker variant={variant} />
    </ThemeProvider>,
  )

describe('ThemePicker', () => {
  afterEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.motion
  })

  it('groups the themes into Futuristic, Modern, Animated and Retro', () => {
    renderPicker()
    const futuristic = screen.getByRole('group', { name: 'Futuristic' })
    for (const name of ['Neon', 'Deep Space', 'Matrix', 'Solar Flare', 'Hologram']) {
      expect(within(futuristic).getByRole('radio', { name: new RegExp(name) })).toBeInTheDocument()
    }
    const modern = screen.getByRole('group', { name: 'Modern' })
    for (const name of ['Midnight Calm', 'Rose Dusk', 'Nordic Frost', 'Paper Sage', 'Liquid Glass']) {
      expect(within(modern).getByRole('radio', { name: new RegExp(name) })).toBeInTheDocument()
    }
    const animated = screen.getByRole('group', { name: 'Animated' })
    for (const name of ['Particle Mesh', 'Day / Night', 'Isometric', 'Rose Bloom']) {
      expect(within(animated).getByRole('radio', { name: new RegExp(name) })).toBeInTheDocument()
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
    expect(labels).toEqual(['Futuristic', 'Modern', 'Animated', 'Retro'])
    expect(screen.getByRole('option', { name: 'Retro 8-bit' })).toBeInTheDocument()
  })

  it('marks the theme group on <html> so the Modern look applies', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('radio', { name: /Nordic Frost/ }))
    expect(document.documentElement.dataset.theme).toBe('frost')
    expect(document.documentElement.dataset.themeGroup).toBe('modern')
  })

  it('marks the Animated group too', async () => {
    renderPicker()
    await userEvent.click(screen.getByRole('radio', { name: /Rose Bloom/ }))
    expect(document.documentElement.dataset.theme).toBe('bloom')
    expect(document.documentElement.dataset.themeGroup).toBe('animated')
  })

  it('turns background motion off and on, and remembers it', async () => {
    renderPicker()
    const motion = screen.getByRole('checkbox', { name: /Background motion/ })
    expect(motion).toBeChecked()

    await userEvent.click(motion)
    expect(motion).not.toBeChecked()
    expect(document.documentElement.dataset.motion).toBe('off')
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('off')

    await userEvent.click(motion)
    expect(document.documentElement.dataset.motion).toBeUndefined()
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('on')
  })

  it('starts with motion off when that was saved', () => {
    localStorage.setItem(MOTION_STORAGE_KEY, 'off')
    renderPicker()
    expect(screen.getByRole('checkbox', { name: /Background motion/ })).not.toBeChecked()
  })

  it('shows a pause button in the top bar only for Animated themes', async () => {
    renderPicker('compact')
    expect(screen.queryByRole('button', { name: /background motion/ })).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByRole('combobox'), 'mesh')
    await userEvent.click(screen.getByRole('button', { name: 'Pause background motion' }))
    expect(document.documentElement.dataset.motion).toBe('off')
    expect(screen.getByRole('button', { name: 'Play background motion' })).toBeInTheDocument()
  })
})