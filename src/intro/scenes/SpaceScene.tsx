import type { CSSProperties } from 'react'
import { WARP_STARS } from './sceneData'
import './space.css'

/** Space: the target locks, the planet drops away and the stars stretch into hyperspace. */
export function SpaceScene() {
  return (
    <div className="scene space-scene" aria-hidden="true">
      <div className="space-nebula" />
      <div className="space-dust" />
      <div className="space-planet">
        <i className="space-ring" />
      </div>
      <div className="space-warp">
        {WARP_STARS.map((star, i) => (
          <i
            key={i}
            style={
              {
                '--a': `${star.angle}deg`,
                '--r': `${star.radius}vmax`,
                width: star.size,
                height: star.size,
                animationDelay: `${star.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="space-tunnel" />
      <div className="space-reticle">
        <i />
      </div>
    </div>
  )
}