// One gate, eight skins: each ROSE theme dresses the entrance differently.
// Colours and materials live in gate.css under .gate[data-skin='...'];
// this file only says which scenery pieces and which sound each skin uses.
import { isThemeId, type ThemeId } from '../theme/themes'

export type GateSkin = ThemeId
export type Horizon = 'forest' | 'city' | 'dunes' | 'none'
export type SoundProfileId = 'stone' | 'synth' | 'airlock' | 'digital' | 'desert' | 'crystal' | 'truth' | 'gothic'

export interface GateSkinConfig {
  /** Silhouettes behind the wall. */
  horizon: Horizon
  /** Extra layers: stars, falling code, a floor grid, the transmutation circle. */
  stars?: boolean
  rain?: boolean
  grid?: boolean
  circle?: boolean
  /** The Gate of Truth has an eye in the dark behind its doors. */
  eye?: boolean
  sound: SoundProfileId
  /** Status line while the gate lands, then while it opens. */
  lines: readonly [string, string]
}

export const GATE_SKINS: Readonly<Record<GateSkin, GateSkinConfig>> = {
  neon: { horizon: 'city', grid: true, sound: 'synth', lines: ['Identity verified\u2026', 'Unlocking the grid'] },
  space: { horizon: 'none', stars: true, sound: 'airlock', lines: ['Docking clearance granted\u2026', 'Opening the blast doors'] },
  matrix: { horizon: 'none', rain: true, grid: true, sound: 'digital', lines: ['Decrypting your key\u2026', 'Entering the system'] },
  solar: { horizon: 'dunes', sound: 'desert', lines: ['The sun gate awakens\u2026', 'Opening to the light'] },
  hologram: { horizon: 'city', grid: true, sound: 'crystal', lines: ['Projecting the gateway\u2026', 'Phasing through'] },
  hunter: { horizon: 'forest', sound: 'stone', lines: ['The gate recognises you\u2026', 'Opening the gate'] },
  alchemist: { horizon: 'none', circle: true, eye: true, sound: 'truth', lines: ['Equivalent exchange accepted\u2026', 'The Gate of Truth opens'] },
  deathnote: { horizon: 'forest', sound: 'gothic', lines: ['Your name is not in the notebook\u2026', 'The iron gate opens'] },
}

/** The skin follows the current theme (set on <html data-theme> by ThemeProvider). */
export function currentGateSkin(): GateSkin {
  const theme = typeof document === 'undefined' ? undefined : document.documentElement.dataset.theme
  return isThemeId(theme) ? theme : 'hunter'
}