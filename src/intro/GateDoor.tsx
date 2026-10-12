import type { CSSProperties } from 'react'
import { DOOR_COUNT, DOOR_SIZES } from './gateConfig'

export type Side = 'left' | 'right'

interface GateDoorProps {
  door: number
  side: Side
  /** Engraved numbers glow once the gate has accepted you. */
  lit: boolean
  /** True during the swing, when the whole leaf opens. */
  wideOpen: boolean
}

const pct = (n: number) => `${(n * 100).toFixed(3)}%`

/**
 * One door of one leaf, rendered recursively: door 7 contains door 6, which
 * contains door 5, and so on. Each door rotates around its own hinge, and
 * because the smaller doors are *children*, they ride along in 3D when a bigger
 * door swings. That is CSS `transform-style: preserve-3d` at work.
 */
export function GateDoor({ door, side, lit, wideOpen }: GateDoorProps) {
  const size = DOOR_SIZES[door - 1]
  const parent = door < DOOR_COUNT ? DOOR_SIZES[door] : undefined
  const inner = door > 1 ? DOOR_SIZES[door - 2] : undefined

  // The stone face is L-shaped: it has a hole where the next smaller door sits,
  // so when that door swings you see light through the gap, not more stone.
  let clipPath: string | undefined
  let numberTop = 0.3
  if (inner) {
    const holeW = inner.w / size.w
    const holeTop = 1 - inner.h / size.h
    numberTop = holeTop / 2
    clipPath =
      side === 'left'
        ? `polygon(0 0, 100% 0, 100% ${pct(holeTop)}, ${pct(1 - holeW)} ${pct(holeTop)}, ${pct(1 - holeW)} 100%, 0 100%)`
        : `polygon(0 0, 100% 0, 100% 100%, ${pct(holeW)} 100%, ${pct(holeW)} ${pct(holeTop)}, 0 ${pct(holeTop)})`
  }

  const style = {
    width: parent ? pct(size.w / parent.w) : '100%',
    height: parent ? pct(size.h / parent.h) : '100%',
    // Only the outermost door swings; the smaller ones ride along inside it.
    '--angle': wideOpen && door === DOOR_COUNT ? '104deg' : '0deg',
  } as CSSProperties

  return (
    <div className="gate-door" data-door={door} style={style}>
      <div className="gate-door__face" style={{ clipPath }}>
        {/* The number straddles the seam, so it splits in two when the door opens. */}
        <span
          className={`gate-door__number${lit ? ' is-lit' : ''}`}
          // Light the numbers 1 -> 7 in a quick cascade.
          style={{ top: pct(numberTop), transitionDelay: `${(door - 1) * 45}ms` }}
        >
          {door}
        </span>
      </div>
      <div className="gate-door__edge" />
      {door > 1 && <GateDoor door={door - 1} side={side} lit={lit} wideOpen={wideOpen} />}
    </div>
  )
}