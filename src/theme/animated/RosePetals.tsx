import { useState, type CSSProperties } from 'react'
import { isSmallScreen } from './device'

interface Petal {
  left: number
  duration: number
  delay: number
  size: number
}

function makePetals(count: number): Petal[] {
  return Array.from({ length: count }, () => {
    const duration = 14 + Math.random() * 14
    return {
      left: Math.random() * 110,
      duration,
      // A negative delay starts the animation part-way through, so petals are already falling on load.
      delay: Math.random() * duration,
      size: 10 + Math.random() * 12,
    }
  })
}

/** Petals drifting down. Each petal is two elements: the outer one falls, the inner one sways. */
export function RosePetals() {
  const [petals] = useState(() => makePetals(isSmallScreen() ? 10 : 18))

  return (
    <div className="petal-layer">
      {petals.map((petal, i) => (
        <div
          key={i}
          className="petal"
          style={
            {
              left: `${petal.left.toFixed(0)}%`,
              '--d': `${petal.duration.toFixed(1)}s`,
              '--delay': `-${petal.delay.toFixed(1)}s`,
              '--s': `${petal.size.toFixed(0)}px`,
            } as CSSProperties
          }
        >
          <i />
        </div>
      ))}
    </div>
  )
}