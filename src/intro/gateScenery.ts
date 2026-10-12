// Scenery data generated once from a seeded random generator, so it looks
// organic but is identical on every load (and pure during render).

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** SVG path of a jagged pine-forest skyline in a 1600 x 300 box. */
function forestPath(seed: number, minHeight: number, maxHeight: number): string {
  const rand = mulberry32(seed)
  let d = 'M0 300 L0 220'
  let x = 0
  while (x < 1600) {
    const width = 14 + rand() * 30
    const peak = 300 - (minHeight + rand() * (maxHeight - minHeight))
    d += ` L${(x + width / 2).toFixed(1)} ${peak.toFixed(1)} L${(x + width).toFixed(1)} ${(peak + 40 + rand() * 60).toFixed(1)}`
    x += width * 0.8
  }
  return `${d} L1600 300 Z`
}

export const FOREST_FAR = forestPath(7, 90, 190)
export const FOREST_NEAR = forestPath(19, 60, 150)

export interface DustGrain {
  left: number
  delay: number
  size: number
  drift: number
  duration: number
}

const dustRand = mulberry32(42)
export const DUST: readonly DustGrain[] = Array.from({ length: 26 }, () => ({
  left: 4 + dustRand() * 92,
  delay: dustRand() * 0.35,
  size: 2 + dustRand() * 4,
  drift: (dustRand() - 0.5) * 40,
  duration: 1.1 + dustRand() * 0.9,
}))