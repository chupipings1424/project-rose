export interface ThemeDefinition {
  id: string
  name: string
  description: string
  mode: 'dark' | 'light'
  /** background, primary accent, secondary accent - used for the preview swatch */
  swatch: readonly [string, string, string]
}

// `as const` keeps the literal ids ('neon', 'space', ...) instead of widening
// them to `string`; `satisfies` still checks every entry matches ThemeDefinition.
export const THEMES = [
  {
    id: 'neon',
    name: 'Neon Cyberpunk',
    description: 'Magenta and cyan on midnight violet',
    mode: 'dark',
    swatch: ['#0b0420', '#ff2bd6', '#00f0ff'],
  },
  {
    id: 'space',
    name: 'Deep Space',
    description: 'Nebula blues and starlight',
    mode: 'dark',
    swatch: ['#050816', '#6c8cff', '#c38bff'],
  },
  {
    id: 'matrix',
    name: 'Matrix',
    description: 'Phosphor-green terminal glow',
    mode: 'dark',
    swatch: ['#020a04', '#00ff6a', '#c6ff3d'],
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    description: 'Molten amber and plasma red',
    mode: 'dark',
    swatch: ['#140703', '#ff8a00', '#ff3d5a'],
  },
  {
    id: 'hologram',
    name: 'Hologram',
    description: 'Bright iridescent glass',
    mode: 'light',
    swatch: ['#eef2ff', '#7c3aed', '#0891b2'],
  },
  {
    id: 'hunter',
    name: 'Hunter × Hunter',
    description: "Killua's Godspeed: lightning on night blue",
    mode: 'dark',
    swatch: ['#040818', '#3cc8ff', '#eaf4ff'],
  },
  {
    id: 'alchemist',
    name: 'Fullmetal Alchemist',
    description: 'Crimson coat and blue transmutation light',
    mode: 'dark',
    swatch: ['#0d0507', '#e3262f', '#3ea6ff'],
  },
  {
    id: 'deathnote',
    name: 'Death Note',
    description: 'Blood-red ink on gothic black',
    mode: 'dark',
    swatch: ['#060506', '#b3001b', '#ece4d8'],
  },
] as const satisfies readonly ThemeDefinition[]

/** A union of the ids above: 'neon' | 'space' | ... | 'deathnote' */
export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = 'neon'
export const THEME_STORAGE_KEY = 'rose.theme'

/** A type guard: when it returns true, TypeScript knows `value` is a ThemeId. */
export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}