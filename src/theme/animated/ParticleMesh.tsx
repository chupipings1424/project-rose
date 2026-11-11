import { useEffect, useRef } from 'react'
import { hasMouse, isSmallScreen, prefersReducedMotion } from './device'
import { DESKTOP_MESH, PHONE_MESH, createPoints, drawMesh, pointCount, stepPoints, type MeshPoint } from './mesh'

/**
 * A <canvas> constellation. One canvas is far cheaper than hundreds of DOM elements: the browser
 * paints a single bitmap. requestAnimationFrame stops by itself when the tab is hidden.
 */
export function ParticleMesh({ motion }: { motion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const phone = isSmallScreen()
    const settings = phone ? PHONE_MESH : DESKTOP_MESH
    const animate = motion && !prefersReducedMotion()
    const pointer = hasMouse() && animate ? { x: -1e4, y: -1e4 } : null
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--mesh').trim() || '94, 234, 212'

    let width = 0
    let height = 0
    let points: MeshPoint[] = []
    let frame = 0
    let last = 0

    const fit = () => {
      // Sharp on retina screens, but capped: a 3x iPhone canvas would be 9x the pixels.
      const ratio = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const wanted = pointCount(width, height, settings)
      // Small changes (the iPhone address bar) keep the points; a rotation re-spreads them.
      if (Math.abs(wanted - points.length) > points.length * 0.25) points = createPoints(wanted, width, height)
    }
    const draw = () => drawMesh(ctx, points, width, height, settings.linkDistance, rgb)

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick)
      if (time - last < settings.minFrameMs) return
      const dt = last ? Math.min(50, time - last) : 16
      last = time
      stepPoints(points, dt, width, height, pointer)
      draw()
    }

    fit()
    if (animate) frame = requestAnimationFrame(tick)
    else draw()

    let resizeTimer = 0
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        fit()
        if (!animate) draw()
      }, 150)
    }
    const onMove = (event: PointerEvent) => {
      if (pointer && event.pointerType === 'mouse') {
        pointer.x = event.clientX
        pointer.y = event.clientY
      }
    }
    const onLeave = () => {
      if (pointer) pointer.x = pointer.y = -1e4
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [motion])

  return <canvas ref={canvasRef} className="mesh-canvas" />
}