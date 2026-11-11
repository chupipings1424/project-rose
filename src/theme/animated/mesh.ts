/** Pure maths for the Particle Mesh theme, kept out of the component so it can be unit tested. */

export interface MeshPoint {
  x: number
  y: number
  /** speed in px per millisecond */
  vx: number
  vy: number
}

export interface MeshSettings {
  maxPoints: number
  /** one point per this many square pixels */
  areaPerPoint: number
  /** points closer than this get a line between them */
  linkDistance: number
  /** skip frames that come sooner than this (32 = about 30 fps) */
  minFrameMs: number
}

export const PHONE_MESH: MeshSettings = { maxPoints: 40, areaPerPoint: 9000, linkDistance: 90, minFrameMs: 32 }
export const DESKTOP_MESH: MeshSettings = { maxPoints: 90, areaPerPoint: 14000, linkDistance: 120, minFrameMs: 0 }

/** Points within this many px of the mouse are pushed away. */
export const REPEL_RADIUS = 110
const MAX_SPEED = 0.02
/** how far off-screen a point may drift before it wraps to the other side */
const EDGE = 10

export function pointCount(width: number, height: number, settings: MeshSettings): number {
  return Math.max(0, Math.min(settings.maxPoints, Math.round((width * height) / settings.areaPerPoint)))
}

export function createPoints(count: number, width: number, height: number, random: () => number = Math.random): MeshPoint[] {
  const between = (min: number, max: number) => min + random() * (max - min)
  return Array.from({ length: count }, () => ({
    x: between(0, width),
    y: between(0, height),
    vx: between(-MAX_SPEED, MAX_SPEED),
    vy: between(-MAX_SPEED, MAX_SPEED),
  }))
}

/** Moves every point `dt` ms forward (in place), wraps at the edges and, if given, pushes points away from the pointer. */
export function stepPoints(
  points: MeshPoint[],
  dt: number,
  width: number,
  height: number,
  pointer: { x: number; y: number } | null = null,
): void {
  for (const p of points) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.x < -EDGE) p.x = width + EDGE
    else if (p.x > width + EDGE) p.x = -EDGE
    if (p.y < -EDGE) p.y = height + EDGE
    else if (p.y > height + EDGE) p.y = -EDGE

    if (pointer) {
      const dx = p.x - pointer.x
      const dy = p.y - pointer.y
      const distance = Math.hypot(dx, dy)
      if (distance > 0.1 && distance < REPEL_RADIUS) {
        const push = (1 - distance / REPEL_RADIUS) * dt * 0.08
        p.x += (dx / distance) * push
        p.y += (dy / distance) * push
      }
    }
  }
}

/** Draws the lines and dots. `rgb` is "r, g, b" (from the theme's --mesh CSS variable). */
export function drawMesh(
  ctx: CanvasRenderingContext2D,
  points: readonly MeshPoint[],
  width: number,
  height: number,
  linkDistance: number,
  rgb: string,
): void {
  ctx.clearRect(0, 0, width, height)
  ctx.lineWidth = 1
  const maxSquared = linkDistance * linkDistance
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x
      const dy = points[i].y - points[j].y
      const squared = dx * dx + dy * dy
      if (squared < maxSquared) {
        const alpha = (1 - Math.sqrt(squared) / linkDistance) * 0.45
        ctx.strokeStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.moveTo(points[i].x, points[i].y)
        ctx.lineTo(points[j].x, points[j].y)
        ctx.stroke()
      }
    }
  }
  ctx.fillStyle = `rgba(${rgb}, 0.9)`
  for (const p of points) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2)
    ctx.fill()
  }
}