import { CITY_FAR, CITY_NEAR } from '../gateScenery'
import './neon.css'

/** Neon: the sign flickers on, the signal glitches, and the picture tears open. */
export function NeonScene() {
  return (
    <div className="scene neon-scene" aria-hidden="true">
      <div className="neon-world">
        <div className="neon-sky" />
        <div className="neon-sun" />
        <svg className="scene-horizon neon-city neon-city--far" viewBox="0 0 1600 300" preserveAspectRatio="none">
          <path d={CITY_FAR} />
        </svg>
        <svg className="scene-horizon neon-city neon-city--near" viewBox="0 0 1600 300" preserveAspectRatio="none">
          <path d={CITY_NEAR} />
        </svg>
        <div className="neon-floor">
          <div className="neon-grid" />
        </div>
        <div className="neon-sign">
          <span className="neon-word neon-word--cyan">ROSE</span>
          <span className="neon-word neon-word--pink">ROSE</span>
          <span className="neon-word neon-word--main">ROSE</span>
        </div>
      </div>
      <div className="neon-bars">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="neon-tear" />
    </div>
  )
}