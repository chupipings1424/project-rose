import { describe, expect, it } from 'vitest'
import { THEMES } from '../theme/themes'
import { GATE_SKINS } from './gateSkins'
import { SOUND_PROFILES } from './gateSound'

describe('gate skins', () => {
  it.each(THEMES.map((theme) => theme.id))('%s has a skin with a sound profile', (id) => {
    const skin = GATE_SKINS[id]
    expect(skin.lines).toHaveLength(2)
    expect(SOUND_PROFILES[skin.sound]).toBeDefined()
  })

  it('gives every theme its own sound', () => {
    const sounds = new Set(Object.values(GATE_SKINS).map((skin) => skin.sound))
    expect(sounds.size).toBe(THEMES.length)
  })
})