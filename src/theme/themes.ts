export type ThemeGroup = 'futuristic' | 'retro'

export interface ThemeDefinition {
  id: string
  name: string
  description: string
  /** Where the picker lists it. */
  group: ThemeGroup
  mode: 'dark' | 'light'
  /** background, primary accent, secondary accent - used for the preview swatch */
  swatch: readonly [string, string, string]
}

// `as const` keeps the literal ids ('neon', 'space', ...) instead of widening
// them to `string`; `satisfies` still checks every entry matches ThemeDefinition.
export const THEMES = [
  {
    id: 'neon',
    group: 'futuristic',
    name: 'Neon Cyberpunk',
    description: 'Magenta and cyan on midnight violet',
    mode: 'dark',
    swatch: ['#0b0420', '#ff2bd6', '#00f0ff'],
  },
  {
    id: 'space',
    group: 'futuristic',
    name: 'Deep Space',
    description: 'Nebula blues and starlight',
    mode: 'dark',
    swatch: ['#050816', '#6c8cff', '#c38bff'],
  },
  {
    id: 'matrix',
    group: 'futuristic',
    name: 'Matrix',
    description: 'Phosphor-green terminal glow',
    mode: 'dark',
    swatch: ['#020a04', '#00ff6a', '#c6ff3d'],
  },
  {
    id: 'solar',
    group: 'futuristic',
    name: 'Solar Flare',
    description: 'Molten amber and plasma red',
    mode: 'dark',
    swatch: ['#140703', '#ff8a00', '#ff3d5a'],
  },
  {
    id: 'hologram',
    group: 'futuristic',
    name: 'Hologram',
    description: 'Bright iridescent glass',
    mode: 'light',
    swatch: ['#eef2ff', '#7c3aed', '#0891b2'],
  },
  {
    id: 'retro',
    group: 'retro',
    name: 'Retro 8-bit',
    description: 'Handheld-console greens and pixel type',
    mode: 'light',
    swatch: ['#9bbc0f', '#306230', '#0f380f'],
  },
] as const satisfies readonly ThemeDefinition[]

export const THEME_GROUPS: readonly { id: ThemeGroup; label: string }[] = [
  { id: 'futuristic', label: 'Futuristic' },
  { id: 'retro', label: 'Retro' },
]

/** A union of the ids above: 'neon' | 'space' | ... | 'retro' */
export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = 'neon'
export const THEME_STORAGE_KEY = 'rose.theme'

/** A type guard: when it returns true, TypeScript knows `value` is a ThemeId. */
export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}