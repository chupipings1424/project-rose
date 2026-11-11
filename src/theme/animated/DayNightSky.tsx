import { useState, type CSSProperties } from 'react'
import { isSmallScreen } from './device'

interface Star {
  left: number
  top: number
  size: number
  duration: number
  delay: number
}

function makeStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() < 0.2 ? 3 : 2,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 5,
  }))
}

/** [top %, seconds to cross the screen, width in vmax] */
const CLOUDS = [
  [8, 95, 36],
  [22, 120, 32],
  [38, 80, 27],
  [14, 140, 23],
] as const

/**
 * Sky, sun, moon, stars and clouds. Which of them show is decided in CSS by <html data-phase>
 * (dawn / day / sunset / night), which Background.tsx keeps in step with the clock.
 */
export function DayNightSky() {
  // Random positions are made once (lazy useState), not on every render.
  const [stars] = useState(() => makeStars(isSmallScreen() ? 40 : 60))

  return (
    <div className="dn-layer">
      <div className="dn-sky" />
      <div className="dn-stars">
        {stars.map((star, i) => (
          <span
            key={i}
            style={
              {
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                '--d': `${star.duration.toFixed(1)}s`,
                '--delay': `-${star.delay.toFixed(1)}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="dn-sun" />
      <div className="dn-moon" />
      {CLOUDS.map(([top, seconds, size], i) => (
        <div
          key={i}
          className="dn-cloud"
          style={
            {
              top: `${top}%`,
              '--w': `${size}vmax`,
              '--d': `${seconds}s`,
              '--delay': `-${(seconds * i) / 4}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}