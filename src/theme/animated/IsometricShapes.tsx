import type { CSSProperties } from 'react'

type Faces = readonly [top: string, left: string, right: string]
type Shape = readonly [kind: 'cube' | 'pyramid', x: number, y: number, size: number, faces: Faces]

const INDIGO: Faces = ['#c7d2fe', '#a5b4fc', '#818cf8']
const AMBER: Faces = ['#fde68a', '#fcd34d', '#f59e0b']

/** Laid out on a 1000 x 1000 board for wide screens. */
const WIDE: readonly Shape[] = [
  ['cube', 150, 190, 70, INDIGO],
  ['cube', 840, 150, 46, AMBER],
  ['cube', 880, 640, 92, INDIGO],
  ['pyramid', 130, 780, 60, AMBER],
  ['cube', 520, 900, 40, INDIGO],
  ['pyramid', 640, 110, 36, INDIGO],
  ['cube', 300, 520, 26, AMBER],
  ['pyramid', 730, 430, 30, INDIGO],
  ['cube', 420, 300, 18, INDIGO],
]

/** The same shapes squeezed onto a 500 x 1000 board, so a phone held upright still sees them all. */
const TALL: readonly Shape[] = WIDE.map(([kind, x, y, size, faces]) => [kind, x / 2, y, size * 0.6, faces])

// An isometric cube is three rhombuses; cos(30deg) = 0.866 gives the classic 30-degree slant.
function Cube({ x, y, s, faces: [top, left, right] }: { x: number; y: number; s: number; faces: Faces }) {
  const k = s * 0.866
  return (
    <>
      <polygon fill={top} points={`${x},${y - s} ${x + k},${y - s / 2} ${x},${y} ${x - k},${y - s / 2}`} />
      <polygon fill={left} points={`${x - k},${y - s / 2} ${x},${y} ${x},${y + s} ${x - k},${y + s / 2}`} />
      <polygon fill={right} points={`${x},${y} ${x + k},${y - s / 2} ${x + k},${y + s / 2} ${x},${y + s}`} />
    </>
  )
}

function Pyramid({ x, y, s, faces: [, left, right] }: { x: number; y: number; s: number; faces: Faces }) {
  return (
    <>
      <polygon fill={left} points={`${x},${y - s * 1.3} ${x - s * 0.866},${y} ${x},${y + s * 0.5}`} />
      <polygon fill={right} points={`${x},${y - s * 1.3} ${x},${y + s * 0.5} ${x + s * 0.866},${y}`} />
    </>
  )
}

function Board({ shapes, width, className }: { shapes: readonly Shape[]; width: number; className: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${width} 1000`} preserveAspectRatio="xMidYMid slice">
      {shapes.map(([kind, x, y, size, faces], i) => (
        <g
          key={i}
          className="iso-shape"
          opacity={0.6}
          style={{ '--d': `${16 + (i % 4) * 3}s`, '--delay': `-${i * 2}s` } as CSSProperties}
        >
          {kind === 'cube' ? <Cube x={x} y={y} s={size} faces={faces} /> : <Pyramid x={x} y={y} s={size} faces={faces} />}
        </g>
      ))}
    </svg>
  )
}

/** Low-poly shapes that float and turn a little. SVG stays sharp at any size and costs almost nothing. */
export function IsometricShapes() {
  return (
    <div className="iso-layer">
      <Board shapes={WIDE} width={1000} className="iso-wide" />
      <Board shapes={TALL} width={500} className="iso-tall" />
    </div>
  )
}