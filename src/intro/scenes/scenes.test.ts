import { describe, expect, it } from 'vitest'
import { THEMES } from '../../theme/themes'
import { SCENES } from '.'

describe('entrance scenes', () => {
  it.each(THEMES.map((theme) => theme.id))('%s has a scene', (id) => {
    expect(SCENES[id]).toBeTypeOf('function')
  })
})