export type ThemeGroup = 'futuristic' | 'modern' | 'animated' | 'retro'

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
    id: 'midnight',
    group: 'modern',
    name: 'Midnight Calm',
    description: 'Graphite with soft indigo and teal',
    mode: 'dark',
    swatch: ['#0f1115', '#7c8cff', '#4fd1c5'],
  },
  {
    id: 'dusk',
    group: 'modern',
    name: 'Rose Dusk',
    description: 'Warm plum with rose pink and gold',
    mode: 'dark',
    swatch: ['#1c1420', '#f28ab2', '#f6c177'],
  },
  {
    id: 'frost',
    group: 'modern',
    name: 'Nordic Frost',
    description: 'Muted slate with icy cyan and sage',
    mode: 'dark',
    swatch: ['#232a35', '#88c0d0', '#a3be8c'],
  },
  {
    id: 'paper',
    group: 'modern',
    name: 'Paper Sage',
    description: 'Warm paper with sage and terracotta',
    mode: 'light',
    swatch: ['#f7f5f0', '#4f7c6b', '#c0794f'],
  },
  {
    id: 'glass',
    group: 'modern',
    name: 'Liquid Glass',
    description: 'Frosted iPhone-style glass on a colourful wallpaper',
    mode: 'light',
    swatch: ['#f4f7fd', '#007aff', '#ff6fb5'],
  },
  {
    id: 'mesh',
    group: 'animated',
    name: 'Particle Mesh',
    description: 'A slow constellation that moves away from your mouse',
    mode: 'dark',
    swatch: ['#050a16', '#2dd4bf', '#60a5fa'],
  },
  {
    id: 'daynight',
    group: 'animated',
    name: 'Day / Night',
    description: 'Sunrise, clouds, sunset and stars - follows your clock',
    mode: 'dark',
    swatch: ['#0b1233', '#3d8ef0', '#f99d5a'],
  },
  {
    id: 'isometric',
    group: 'animated',
    name: 'Isometric',
    description: 'Light theme with floating low-poly shapes',
    mode: 'light',
    swatch: ['#eef1f8', '#4f46e5', '#f59e0b'],
  },
  {
    id: 'bloom',
    group: 'animated',
    name: 'Rose Bloom',
    description: 'Rose-gold glow with petals drifting down',
    mode: 'dark',
    swatch: ['#1a0c14', '#f48fb1', '#e8b48a'],
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
  { id: 'modern', label: 'Modern' },
  { id: 'animated', label: 'Animated' },
  { id: 'retro', label: 'Retro' },
]

/** A union of the ids above: 'neon' | 'space' | ... | 'retro' */
export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = 'neon'
export const THEME_STORAGE_KEY = 'rose.theme'
/** 'off' pauses the animated backgrounds; anything else (or nothing) means on. */
export const MOTION_STORAGE_KEY = 'rose.motion'

/** A type guard: when it returns true, TypeScript knows `value` is a ThemeId. */
export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}

export function themeGroupOf(id: ThemeId): ThemeGroup {
  return THEMES.find((theme) => theme.id === id)?.group ?? 'futuristic'
}