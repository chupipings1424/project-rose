import { describe, expect, it } from 'vitest'
import { DESKTOP_MESH, PHONE_MESH, REPEL_RADIUS, createPoints, pointCount, stepPoints, type MeshPoint } from './mesh'

const still = (x: number, y: number): MeshPoint => ({ x, y, vx: 0, vy: 0 })

describe('pointCount', () => {
  it('scales with the screen area', () => {
    expect(pointCount(390, 844, PHONE_MESH)).toBe(37) // an iPhone screen
    expect(pointCount(600, 400, DESKTOP_MESH)).toBe(17)
  })

  it('never goes over the cap', () => {
    expect(pointCount(1920, 1080, DESKTOP_MESH)).toBe(DESKTOP_MESH.maxPoints)
    expect(pointCount(1024, 1366, PHONE_MESH)).toBe(PHONE_MESH.maxPoints)
  })

  it('is zero for an empty canvas', () => {
    expect(pointCount(0, 0, DESKTOP_MESH)).toBe(0)
  })
})

describe('createPoints', () => {
  it('places points inside the canvas with a slow speed', () => {
    let seed = 0
    const random = () => (seed = (seed + 0.37) % 1)
    const points = createPoints(20, 300, 200, random)
    expect(points).toHaveLength(20)
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(300)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(200)
      expect(Math.abs(p.vx)).toBeLessThanOrEqual(0.02)
      expect(Math.abs(p.vy)).toBeLessThanOrEqual(0.02)
    }
  })
})

describe('stepPoints', () => {
  it('moves by speed x time', () => {
    const p = { x: 50, y: 50, vx: 0.01, vy: -0.02 }
    stepPoints([p], 100, 300, 200)
    expect(p.x).toBeCloseTo(51)
    expect(p.y).toBeCloseTo(48)
  })

  it('wraps a point that leaves one side to the other side', () => {
    const left = { x: -9, y: 50, vx: -0.02, vy: 0 }
    const bottom = { x: 50, y: 209, vx: 0, vy: 0.02 }
    stepPoints([left, bottom], 100, 300, 200)
    expect(left.x).toBe(310)
    expect(bottom.y).toBe(-10)
  })

  it('pushes points near the pointer away from it', () => {
    const near = still(120, 100)
    stepPoints([near], 16, 300, 200, { x: 100, y: 100 })
    expect(near.x).toBeGreaterThan(120)
    expect(near.y).toBe(100)
  })

  it('leaves points outside the radius alone', () => {
    const far = still(100 + REPEL_RADIUS + 1, 100)
    stepPoints([far], 16, 300, 200, { x: 100, y: 100 })
    expect(far.x).toBe(100 + REPEL_RADIUS + 1)
  })
})