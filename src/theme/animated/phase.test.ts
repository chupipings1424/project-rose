import { describe, expect, it } from 'vitest'
import { phaseOf } from './phase'

describe('phaseOf', () => {
  it.each([
    [0, 'night'],
    [4, 'night'],
    [5, 'dawn'],
    [6, 'dawn'],
    [7, 'day'],
    [12, 'day'],
    [16, 'day'],
    [17, 'sunset'],
    [18, 'sunset'],
    [19, 'night'],
    [23, 'night'],
  ])('hour %i is %s', (hour, phase) => {
    expect(phaseOf(hour)).toBe(phase)
  })
})