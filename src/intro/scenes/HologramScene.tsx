import type { CSSProperties } from 'react'
import { SHARDS } from './sceneData'
import './hologram.css'

/** Hologram: a projector builds the word in light, then the glass shatters outward. */
export function HologramScene() {
  return (
    <div className="scene holo-scene" aria-hidden="true">
      <div className="holo-room" />
      <div className="holo-beam" />
      <div className="holo-projector" />
      <div className="holo-rings">
        <i />
        <i />
        <i />
      </div>
      <div className="holo-word">ROSE</div>
      <div className="holo-burst" />
      <div className="holo-glass">
        {SHARDS.map((shard, i) => (
          <i
            key={i}
            style={
              {
                clipPath: shard.clip,
                '--dx': `${shard.dx}vw`,
                '--dy': `${shard.dy}vh`,
                '--rot': `${shard.rot}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <svg className="holo-cracks" viewBox="0 0 100 100" preserveAspectRatio="none">
        {SHARDS.map((shard, i) => (
          <line key={i} x1={50} y1={48} x2={shard.crack.x} y2={shard.crack.y} pathLength={1} />
        ))}
      </svg>
    </div>
  )
}