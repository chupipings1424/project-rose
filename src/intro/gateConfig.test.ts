import { describe, expect, it } from 'vitest'
import { DOOR_COUNT, DOOR_SIZES } from './gateConfig'

describe('gate geometry', () => {
  it('has seven doors, each strictly inside the next, the last filling the leaf', () => {
    expect(DOOR_SIZES).toHaveLength(DOOR_COUNT)
    for (let i = 1; i < DOOR_SIZES.length; i++) {
      expect(DOOR_SIZES[i].w).toBeGreaterThan(DOOR_SIZES[i - 1].w)
      expect(DOOR_SIZES[i].h).toBeGreaterThan(DOOR_SIZES[i - 1].h)
    }
    expect(DOOR_SIZES.at(-1)).toEqual({ w: 1, h: 1 })
  })
})