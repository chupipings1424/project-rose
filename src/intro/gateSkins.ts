// Every ROSE theme has its own entrance. scenes/index.ts picks the scene
// (the picture and its animation); this file picks the sound and the words.
import { isThemeId, type ThemeId } from '../theme/themes'

export type GateSkin = ThemeId
export type SoundProfileId =
  | 'stone'
  | 'synth'
  | 'airlock'
  | 'digital'
  | 'desert'
  | 'crystal'
  | 'truth'
  | 'gothic'
  | 'ki'
  | 'sharingan'
  | 'getsuga'
  | 'geass'

export interface GateSkinConfig {
  sound: SoundProfileId
  /** Status line while the scene arrives, then while it plays out. */
  lines: readonly [string, string]
}

export const GATE_SKINS: Readonly<Record<GateSkin, GateSkinConfig>> = {
  neon: { sound: 'synth', lines: ['Booting the neon grid\u2026', 'Glitching through'] },
  space: { sound: 'airlock', lines: ['Coordinates locked\u2026', 'Jumping to hyperspace'] },
  matrix: { sound: 'digital', lines: ['Decrypting your key\u2026', 'Entering the system'] },
  solar: { sound: 'desert', lines: ['The sun is rising\u2026', 'Solar flare!'] },
  hologram: { sound: 'crystal', lines: ['Projecting the gateway\u2026', 'Breaking through the glass'] },
  hunter: { sound: 'stone', lines: ['The gate recognises you\u2026', 'Opening the gate'] },
  alchemist: { sound: 'truth', lines: ['Equivalent exchange accepted\u2026', 'The Gate of Truth opens'] },
  deathnote: { sound: 'gothic', lines: ['The notebook opens\u2026', 'A name is written'] },
  dragonball: { sound: 'ki', lines: ['Power level rising\u2026', 'Ka\u2026me\u2026ha\u2026me\u2026HA!'] },
  naruto: { sound: 'sharingan', lines: ['Sharingan awakened\u2026', 'Mangeky\u014d: genjutsu cast'] },
  bleach: { sound: 'getsuga', lines: ['The Senkaimon opens\u2026', 'Getsuga Tensh\u014d!'] },
  geass: { sound: 'geass', lines: ['A contract is sealed\u2026', 'By the power of Geass: enter'] },
}

/** The skin follows the current theme (set on <html data-theme> by ThemeProvider). */
export function currentGateSkin(): GateSkin {
  const theme = typeof document === 'undefined' ? undefined : document.documentElement.dataset.theme
  return isThemeId(theme) ? theme : 'hunter'
}