import { parseIsoDate } from '../../../lib/format'
import type { ChartPoint } from './summary'

export interface ChartGeometry {
  line: string
  area: string
  /** y of the dashed target line */
  targetY: number
  last: { x: number; y: number } | null
}

/**
 * Turns points into SVG path strings - no chart library needed. x follows the real
 * dates (a gap of two months looks like two months), y runs from 0 to the target
 * or the highest balance, whichever is bigger. SVG's y axis points down, hence `height - ...`.
 */
export function chartGeometry(points: ChartPoint[], target: number, width: number, height: number): ChartGeometry {
  const top = Math.max(target, ...points.map((p) => p.total), 1)
  const y = (value: number) => height - (Math.max(0, value) / top) * height
  const targetY = y(target)
  if (points.length === 0) return { line: '', area: '', targetY, last: null }

  const times = points.map((p) => parseIsoDate(p.date)!.getTime())
  const first = times[0]
  const span = times[times.length - 1] - first
  const x = (time: number) => (span === 0 ? width : ((time - first) / span) * width)

  // A step chart: the balance stays flat until the next deposit.
  const coords: [number, number][] = []
  points.forEach((point, i) => {
    if (i > 0) coords.push([x(times[i]), y(points[i - 1].total)])
    coords.push([x(times[i]), y(point.total)])
  })
  if (points.length === 1) coords.unshift([0, y(points[0].total)])

  const round = (n: number) => Math.round(n * 10) / 10
  const line = coords.map(([cx, cy], i) => `${i === 0 ? 'M' : 'L'}${round(cx)},${round(cy)}`).join(' ')
  const [lastX, lastY] = coords[coords.length - 1]
  const area = `${line} L${round(lastX)},${height} L${round(coords[0][0])},${height} Z`
  return { line, area, targetY, last: { x: lastX, y: lastY } }
}