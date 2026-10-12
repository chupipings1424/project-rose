export type ThemeGroup = 'futuristic' | 'anime'

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
    id: 'hunter',
    group: 'anime',
    name: 'Hunter × Hunter',
    description: "Killua's Godspeed: lightning on night blue",
    mode: 'dark',
    swatch: ['#040818', '#3cc8ff', '#eaf4ff'],
  },
  {
    id: 'alchemist',
    group: 'anime',
    name: 'Fullmetal Alchemist',
    description: 'Crimson coat and blue transmutation light',
    mode: 'dark',
    swatch: ['#0d0507', '#e3262f', '#3ea6ff'],
  },
  {
    id: 'deathnote',
    group: 'anime',
    name: 'Death Note',
    description: 'Blood-red ink on gothic black',
    mode: 'dark',
    swatch: ['#060506', '#b3001b', '#ece4d8'],
  },
  {
    id: 'dragonball',
    group: 'anime',
    name: 'Dragon Ball Super',
    description: 'Super Saiyan gold and ki blue',
    mode: 'dark',
    swatch: ['#07081a', '#ff8a1c', '#4aa8ff'],
  },
  {
    id: 'naruto',
    group: 'anime',
    name: 'Naruto',
    description: 'Chakra orange and the Eight Trigrams seal',
    mode: 'dark',
    swatch: ['#0d0806', '#ff7a00', '#e8262b'],
  },
  {
    id: 'bleach',
    group: 'anime',
    name: 'Bleach',
    description: 'Final Getsuga: black reiatsu and blood chains',
    mode: 'dark',
    swatch: ['#050506', '#d8102e', '#9fb4d1'],
  },
  {
    id: 'geass',
    group: 'anime',
    name: 'Code Geass',
    description: 'The red sigil of Geass on royal purple',
    mode: 'dark',
    swatch: ['#08050f', '#e8173a', '#d4af37'],
  },
] as const satisfies readonly ThemeDefinition[]

export const THEME_GROUPS: readonly { id: ThemeGroup; label: string }[] = [
  { id: 'futuristic', label: 'Futuristic' },
  { id: 'anime', label: 'Anime' },
]

/** A union of the ids above: 'neon' | 'space' | ... | 'geass' */
export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = 'neon'
export const THEME_STORAGE_KEY = 'rose.theme'

/** A type guard: when it returns true, TypeScript knows `value` is a ThemeId. */
export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}