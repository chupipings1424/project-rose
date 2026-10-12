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