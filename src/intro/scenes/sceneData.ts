// Particles and shapes for the entrance scenes. Generated once from seeded
// random numbers: organic-looking, but identical on every load.
import { GLYPHS, mulberry32 } from '../gateScenery'

const round = (n: number) => Math.round(n * 10) / 10

/** Space: stars around the centre, ready to stretch into hyperspace streaks. */
export const WARP_STARS = (() => {
  const rand = mulberry32(314)
  return Array.from({ length: 110 }, () => ({
    angle: round(rand() * 360),
    radius: round(3 + Math.pow(rand(), 0.7) * 62),
    size: round(1.2 + rand() * 2.2),
    delay: round(rand() * 0.12),
  }))
})()

/** Hologram: the glass breaks into wedges around one impact point. */
export const SHARDS = (() => {
  const rand = mulberry32(77)
  const count = 13
  const cuts = Array.from({ length: count }, (_, i) => ((i + 0.2 + rand() * 0.6) / count) * Math.PI * 2)
  const far = (a: number) => `${round(50 + Math.cos(a) * 160)}% ${round(48 + Math.sin(a) * 160)}%`
  return cuts.map((a, i) => {
    const b = cuts[(i + 1) % count] + (i === count - 1 ? Math.PI * 2 : 0)
    const mid = (a + b) / 2
    const push = 55 + rand() * 40
    return {
      clip: `polygon(50% 48%, ${far(a)}, ${far(b)})`,
      crack: { x: round(50 + Math.cos(a) * 75), y: round(48 + Math.sin(a) * 75) },
      dx: round(Math.cos(mid) * push),
      dy: round(Math.sin(mid) * push),
      rot: round((rand() - 0.5) * 40),
    }
  })
})()

/** Solar: loops of plasma rising from the edge of the sun (viewBox -100 -100 200 200). */
export const PROMINENCES = [-150, -112, -64, -24, 18, 140].map((deg, i) => {
  const a = (deg * Math.PI) / 180
  const spread = 0.22 + (i % 3) * 0.06
  const lift = 72 + (i % 2) * 16
  const p = (angle: number, r: number) => `${round(Math.cos(angle) * r)} ${round(Math.sin(angle) * r)}`
  return `M${p(a - spread, 48)} Q${p(a, lift)} ${p(a + spread, 48)}`
})

/** Matrix: each letter of ROSE flips through random glyphs before it locks. */
export const DECODE_REELS = (() => {
  const rand = mulberry32(2024)
  return ['R', 'O', 'S', 'E'].map((letter) => [
    ...Array.from({ length: 9 }, () => GLYPHS[Math.floor(rand() * GLYPHS.length)]),
    letter,
  ])
})()

/** Dragon Ball: a jagged mesa skyline (1600 x 300 box). */
export const MESAS = (() => {
  const rand = mulberry32(9001)
  let d = 'M0 300 L0 210'
  let x = 0
  while (x < 1600) {
    const width = 60 + rand() * 180
    const top = 300 - (40 + rand() * 150)
    const lean = 10 + rand() * 25
    d += ` L${round(x + lean)} ${round(top)} L${round(x + width - lean)} ${round(top + rand() * 12)} L${round(x + width)} ${round(260 - rand() * 40)}`
    x += width
  }
  return `${d} L1600 300 Z`
})()

/** Dragon Ball: a spiky Super Saiyan aura (viewBox 0 0 200 300, base at the bottom centre). */
export function auraPath(seed: number): string {
  const rand = mulberry32(seed)
  const spikes = 15
  let d = ''
  for (let i = 0; i <= spikes * 2; i++) {
    const t = Math.PI * (i / (spikes * 2))
    const tip = i % 2 === 1
    const rx = 70 * (tip ? 1.05 + rand() * 0.25 : 0.82)
    const ry = 240 * (tip ? 0.9 + rand() * 0.35 : 0.68)
    const x = 100 - Math.cos(t) * rx * (tip ? 1 : 0.95)
    const y = 290 - Math.sin(t) * ry - (tip ? 0 : 8)
    d += `${i ? 'L' : 'M'}${round(x)} ${round(y)}`
  }
  return `${d}Q100 320 ${round(100 - 70 * 0.82)} 290Z`
}

/** Dragon Ball: rocks lifted by the power-up, and ki gathering into the hands. */
export const DEBRIS = (() => {
  const rand = mulberry32(55)
  return Array.from({ length: 12 }, () => ({
    left: round(8 + rand() * 84),
    size: round(6 + rand() * 18),
    rise: round(18 + rand() * 30),
    delay: round(rand() * 0.5),
    spin: round((rand() - 0.5) * 240),
  }))
})()

export const KI_PARTICLES = (() => {
  const rand = mulberry32(808)
  return Array.from({ length: 22 }, () => {
    const a = rand() * Math.PI * 2
    const r = 18 + rand() * 30
    return { x: round(Math.cos(a) * r), y: round(Math.sin(a) * r), delay: round(rand() * 0.45) }
  })
})()

/** Short zig-zag sparks (a 100 x 100 box) for Super Saiyan and alchemy lightning. */
export function boltPath(seed: number, x0: number, y0: number, x1: number, y1: number, kinks = 5): string {
  const rand = mulberry32(seed)
  let d = `M${x0} ${y0}`
  for (let i = 1; i < kinks; i++) {
    const t = i / kinks
    d += ` L${round(x0 + (x1 - x0) * t + (rand() - 0.5) * 14)} ${round(y0 + (y1 - y0) * t + (rand() - 0.5) * 14)}`
  }
  return `${d} L${x1} ${y1}`
}