import { DUNES_FAR, DUNES_NEAR } from '../gateScenery'
import { PROMINENCES } from './sceneData'
import './solar.css'

/** Solar: the sun rises over the dunes, flares erupt and a shockwave rolls out. */
export function SolarScene() {
  return (
    <div className="scene solar-scene" aria-hidden="true">
      <div className="solar-sky" />
      <div className="solar-sun">
        <div className="solar-corona" />
        <div className="solar-disc" />
        <svg className="solar-flares" viewBox="-100 -100 200 200">
          {PROMINENCES.map((d, i) => (
            <path key={i} d={d} pathLength={1} style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </svg>
      </div>
      <div className="solar-wave" />
      <svg className="scene-horizon solar-dunes solar-dunes--far" viewBox="0 0 1600 300" preserveAspectRatio="none">
        <path d={DUNES_FAR} />
      </svg>
      <svg className="scene-horizon solar-dunes solar-dunes--near" viewBox="0 0 1600 300" preserveAspectRatio="none">
        <path d={DUNES_NEAR} />
      </svg>
      <div className="solar-glare" />
    </div>
  )
}