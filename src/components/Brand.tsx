import { useId } from 'react'
import { Link } from 'react-router-dom'

/**
 * The ROSE mark: a bloom drawn as six rounded squares, each 21% smaller and
 * turned 18 degrees further, so their corners just touch the square outside
 * them and form a spiral of petals. Below it: a stem, a leaf and one thorn.
 */
const CENTER = { x: 32, y: 25 }
const BLOOM = [
  { size: 29, angle: 45, fill: 0.06 },
  { size: 22.9, angle: 63, fill: 0.12 },
  { size: 18.1, angle: 81, fill: 0.2 },
  { size: 14.3, angle: 99, fill: 0.3 },
  { size: 11.3, angle: 117, fill: 0.45 },
  { size: 8.9, angle: 135, fill: 0.7 },
] as const

export const ROSE_STEM = 'M32 45.5c-1.2 5 1 8.6 0 15.5'
export const ROSE_LEAF = 'M32.3 53.2c3.6-4.4 8.9-5.6 13.7-5.2-2.3 4.8-7.3 7.6-13.6 7.1z'
export const ROSE_THORN = 'M31.4 57.6 27 56.2l4.5-1.4z'

export function BrandMark({ size = 32 }: { size?: number }) {
  // useId gives every copy of the logo its own gradient id (two logos on one page is valid HTML).
  const gradient = `rose-${useId().replace(/:/g, '')}`
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${gradient})`} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={ROSE_STEM} strokeWidth="2.6" />
        <path d={ROSE_LEAF} fill={`url(#${gradient})`} fillOpacity="0.35" strokeWidth="1.6" />
        <path d={ROSE_THORN} fill={`url(#${gradient})`} strokeWidth="1" />
        {BLOOM.map(({ size: side, angle, fill }) => (
          <rect
            key={angle}
            x={CENTER.x - side / 2}
            y={CENTER.y - side / 2}
            width={side}
            height={side}
            rx={side * 0.16}
            transform={`rotate(${angle} ${CENTER.x} ${CENTER.y})`}
            fill={`url(#${gradient})`}
            fillOpacity={fill}
            strokeWidth={side > 20 ? 2.4 : 1.9}
          />
        ))}
      </g>
    </svg>
  )
}

export function Brand({ to = '/projects' }: { to?: string }) {
  return (
    <Link to={to} className="brand">
      <BrandMark />
      <span className="brand-text">ROSE</span>
    </Link>
  )
}