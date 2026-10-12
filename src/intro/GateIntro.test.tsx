import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ARRIVE_MS, GATE_MUTE_KEY, OPEN_MS, SKIP_MS } from './gateConfig'
import { GateIntro } from './GateIntro'

const gate = () => document.querySelector('.gate')!

describe('GateIntro', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
  })

  afterEach(() => {
    vi.useRealTimers()
    document.getElementById('root')?.remove()
    delete document.documentElement.dataset.theme
  })

  it('wears the Zoldyck stone gate when no theme is set', () => {
    render(<GateIntro onDone={() => {}} />)
    expect(gate()).toHaveAttribute('data-skin', 'hunter')
    expect(document.querySelectorAll('.gate-forest')).toHaveLength(2)
    expect(screen.getByText('The gate recognises you\u2026')).toBeInTheDocument()
  })

  it('follows the theme: the Gate of Truth for Fullmetal Alchemist', () => {
    document.documentElement.dataset.theme = 'alchemist'
    render(<GateIntro onDone={() => {}} />)

    expect(gate()).toHaveAttribute('data-skin', 'alchemist')
    expect(document.querySelector('.gate-circle')).not.toBeNull()
    expect(document.querySelector('.gate-eye')).not.toBeNull()
    expect(document.querySelector('.gate-forest')).toBeNull()
    expect(document.querySelector('.truth-hands')).not.toBeNull()

    act(() => vi.advanceTimersByTime(ARRIVE_MS))
    expect(screen.getByText('The Gate of Truth opens')).toBeInTheDocument()
  })

  it('rains code for the Matrix theme', () => {
    document.documentElement.dataset.theme = 'matrix'
    render(<GateIntro onDone={() => {}} />)
    expect(gate()).toHaveAttribute('data-skin', 'matrix')
    expect(document.querySelectorAll('.matrix-rain span').length).toBeGreaterThan(20)
    expect(document.querySelectorAll('.matrix-reel')).toHaveLength(4)
  })

  it.each([
    ['neon', '.neon-tear'],
    ['space', '.space-warp i'],
    ['solar', '.solar-flares path'],
    ['hologram', '.holo-glass i'],
    ['deathnote', '.note-cover'],
    ['dragonball', '.kame-beam'],
    ['naruto', '.sharingan-mangekyo'],
    ['bleach', '.senkai-getsuga'],
    ['geass', '.geass-burst svg'],
  ])('plays its own scene for the %s theme', (theme, marker) => {
    document.documentElement.dataset.theme = theme
    render(<GateIntro onDone={() => {}} />)
    expect(gate()).toHaveAttribute('data-skin', theme)
    expect(document.querySelector(marker)).not.toBeNull()
    // Only the door scenes have doors.
    expect(document.querySelector('.gate-door')).toBeNull()
  })

  it('sets the scene clock to the full length of the entrance', () => {
    render(<GateIntro onDone={() => {}} />)
    expect((gate() as HTMLElement).style.getPropertyValue('--scene-t')).toBe(`${ARRIVE_MS + OPEN_MS}ms`)
  })

  it('makes the app behind it inert until the gate is gone', () => {
    const { unmount } = render(<GateIntro onDone={() => {}} />)
    expect(document.getElementById('root')).toHaveAttribute('inert')
    expect(screen.getByRole('dialog', { name: /access granted/i })).toBeInTheDocument()
    unmount()
    expect(document.getElementById('root')).not.toHaveAttribute('inert')
  })

  it('opens by itself - no holding - and then hands over to the app', () => {
    const onDone = vi.fn()
    render(<GateIntro onDone={onDone} />)
    expect(gate()).toHaveAttribute('data-phase', 'arrive')

    act(() => vi.advanceTimersByTime(ARRIVE_MS))
    expect(gate()).toHaveAttribute('data-phase', 'opening')
    expect(document.querySelectorAll('.gate-door__number.is-lit').length).toBe(14)
    expect(onDone).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(OPEN_MS))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it.each([
    ['the Skip button', () => fireEvent.click(screen.getByRole('button', { name: 'Skip' }))],
    ['Escape', () => fireEvent.keyDown(window, { key: 'Escape' })],
  ])('can be skipped with %s', (_, skip) => {
    const onDone = vi.fn()
    render(<GateIntro onDone={onDone} />)
    skip()
    expect(gate()).toHaveAttribute('data-phase', 'leaving')
    act(() => vi.advanceTimersByTime(SKIP_MS))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('remembers the mute choice', () => {
    const { unmount } = render(<GateIntro onDone={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Turn sound off' }))
    expect(localStorage.getItem(GATE_MUTE_KEY)).toBe('1')
    unmount()

    render(<GateIntro onDone={() => {}} />)
    expect(screen.getByRole('button', { name: 'Turn sound on' })).toBeInTheDocument()
  })
})