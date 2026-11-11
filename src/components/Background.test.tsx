import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from '../theme/ThemeProvider'
import { THEME_STORAGE_KEY } from '../theme/themes'
import { Background } from './Background'

// The animated layer is lazy-loaded; the first import can be slow on a busy machine.
const loaded = (container: HTMLElement, selector: string) =>
  waitFor(() => expect(container.querySelector(selector)).toBeInTheDocument(), { timeout: 10_000 })

const renderWith = (theme: string) => {
  localStorage.setItem(THEME_STORAGE_KEY, theme)
  return render(
    <ThemeProvider>
      <Background />
    </ThemeProvider>,
  )
}

describe('Background', () => {
  afterEach(() => {
    delete document.documentElement.dataset.phase
  })

  it('stays static (no animated layer) for the other themes', () => {
    const { container } = renderWith('neon')
    expect(container.querySelector('.bg-orb')).toBeInTheDocument()
    expect(container.querySelector('.petal-layer, .iso-layer, .dn-layer, .mesh-canvas')).not.toBeInTheDocument()
  })

  it('loads the falling petals for Rose Bloom', async () => {
    const { container } = renderWith('bloom')
    await loaded(container, '.petal-layer')
    expect(container.querySelectorAll('.petal').length).toBeGreaterThan(0)
  })

  it('draws both isometric boards (CSS shows the one that fits the screen)', async () => {
    const { container } = renderWith('isometric')
    await loaded(container, '.iso-layer')
    expect(container.querySelectorAll('svg')).toHaveLength(2)
    expect(container.querySelectorAll('.iso-shape')).toHaveLength(18)
  })

  it('sets the Day / Night phase on <html>', async () => {
    const { container } = renderWith('daynight')
    await loaded(container, '.dn-layer')
    expect(['dawn', 'day', 'sunset', 'night']).toContain(document.documentElement.dataset.phase)
    expect(container.querySelectorAll('.dn-cloud')).toHaveLength(4)
  })
})