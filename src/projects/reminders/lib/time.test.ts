import { describe, expect, it } from 'vitest'
import { friendlyTime, fromLocalInput, nextHour, toLocalInput } from './time'

describe('reminder time helpers', () => {
  it('round-trips the datetime-local format', () => {
    expect(toLocalInput(fromLocalInput('2026-10-12T09:05'))).toBe('2026-10-12T09:05')
  })

  it('defaults to the next full hour', () => {
    expect(toLocalInput(nextHour(new Date(2026, 9, 12, 9, 41)))).toBe('2026-10-12T10:00')
  })

  it('says today / tomorrow when it can', () => {
    const now = new Date(2026, 9, 12, 8)
    expect(friendlyTime(new Date(2026, 9, 12, 9, 30).toISOString(), now)).toMatch(/^Today 9:30/)
    expect(friendlyTime(new Date(2026, 9, 13, 7).toISOString(), now)).toMatch(/^Tomorrow 7:00/)
  })
})