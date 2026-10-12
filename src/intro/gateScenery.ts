// Scenery data generated once from a seeded random generator, so it looks
// organic but is identical on every load (and pure during render).

export function mulberry32(seed: number) {
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

/** SVG path of a city skyline (flat roofs, a few antennas) in a 1600 x 300 box. */
function skylinePath(seed: number, minHeight: number, maxHeight: number): string {
  const rand = mulberry32(seed)
  let d = 'M0 300'
  let x = 0
  while (x < 1600) {
    const width = 26 + rand() * 70
    const top = 300 - (minHeight + rand() * (maxHeight - minHeight))
    d += ` L${x.toFixed(1)} ${top.toFixed(1)}`
    if (rand() < 0.22) {
      const mast = x + width / 2
      d += ` L${(mast - 2).toFixed(1)} ${top.toFixed(1)} L${(mast - 2).toFixed(1)} ${(top - 30).toFixed(1)} L${(mast + 2).toFixed(1)} ${(top - 30).toFixed(1)} L${(mast + 2).toFixed(1)} ${top.toFixed(1)}`
    }
    d += ` L${(x + width).toFixed(1)} ${top.toFixed(1)}`
    x += width + rand() * 6
  }
  return `${d} L1600 300 Z`
}

/** SVG path of soft desert dunes (overlapping sine humps) in a 1600 x 300 box. */
function dunePath(seed: number, base: number, swell: number): string {
  const rand = mulberry32(seed)
  const humps = Array.from({ length: 4 }, () => ({ k: 1 + rand() * 3, phase: rand() * Math.PI * 2, amp: swell * (0.3 + rand() * 0.7) }))
  let d = 'M0 300'
  for (let x = 0; x <= 1600; x += 20) {
    const y = humps.reduce((sum, h) => sum + h.amp * Math.sin((x / 1600) * Math.PI * h.k + h.phase), 0) / humps.length
    d += ` L${x} ${(300 - base - y).toFixed(1)}`
  }
  return `${d} L1600 300 Z`
}

export const FOREST_FAR = forestPath(7, 90, 190)
export const FOREST_NEAR = forestPath(19, 60, 150)
export const CITY_FAR = skylinePath(3, 110, 230)
export const CITY_NEAR = skylinePath(11, 50, 140)
export const DUNES_FAR = dunePath(5, 150, 90)
export const DUNES_NEAR = dunePath(23, 70, 70)

export interface RainColumn {
  left: number
  delay: number
  duration: number
  text: string
}

/** Falling code for the Matrix skin: half-width katakana and digits. */
export const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789'
const rainRand = mulberry32(99)
export const RAIN: readonly RainColumn[] = Array.from({ length: 34 }, (_, i) => ({
  left: (i / 34) * 100 + rainRand() * 2,
  delay: -rainRand() * 4,
  duration: 2.4 + rainRand() * 3,
  text: Array.from({ length: 14 + Math.floor(rainRand() * 14) }, () => GLYPHS[Math.floor(rainRand() * GLYPHS.length)]).join(''),
}))

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