import type { CSSProperties } from 'react'
import { GateDoor } from '../GateDoor'
import { DOOR_COUNT } from '../gateConfig'
import { DUST, FOREST_FAR, FOREST_NEAR } from '../gateScenery'
import { boltPath } from './sceneData'
import type { SceneProps } from './types'

type DoorVariant = 'zoldyck' | 'truth'

/** Black arms reaching out of the Gate of Truth (viewBox -100 -100 200 200, from the centre). */
const ARMS = [-160, -120, -75, -30, 15, 60, 110, 150].map((deg, i) => ({ deg, len: 70 + (i % 3) * 14 }))

const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2
  const x = 50 + Math.cos(a) * 34
  const y = 50 + Math.sin(a) * 34
  return { d: boltPath(31 + i, Math.round(x), Math.round(y), Math.round(x + Math.cos(a + 1.2) * 22), Math.round(y + Math.sin(a + 1.2) * 22)), red: i % 2 === 0 }
})

/**
 * The original entrance: a giant gate with seven nested doors lands, its
 * numbers light up and it swings open while the camera flies through.
 * Hunter x Hunter gets the Zoldyck stone gate in a forest; Fullmetal
 * Alchemist gets the Gate of Truth in the white void, with a transmutation
 * circle drawing itself, alchemy sparks and the black hands of Truth.
 */
function DoorScene({ opening, variant }: SceneProps & { variant: DoorVariant }) {
  const truth = variant === 'truth'
  return (
    <div className="gate-world" style={{ '--door': opening ? DOOR_COUNT : 0 } as CSSProperties}>
      <div className="gate-sky" />
      <div className="gate-moon" />
      {!truth && (
        <>
          <svg className="gate-forest gate-forest--far" viewBox="0 0 1600 300" preserveAspectRatio="none" aria-hidden="true">
            <path d={FOREST_FAR} />
          </svg>
          <svg className="gate-forest gate-forest--near" viewBox="0 0 1600 300" preserveAspectRatio="none" aria-hidden="true">
            <path d={FOREST_NEAR} />
          </svg>
        </>
      )}
      <div className="gate-fog gate-fog--back" />

      <div className="gate-wall">
        <div className="gate-wall__cap" />
        <div className="gate-portal">
          <div className="gate-beyond">
            {truth && (
              <>
                <div className="gate-eye" />
                <svg className="truth-hands" viewBox="-100 -100 200 200" aria-hidden="true">
                  {ARMS.map((arm, i) => (
                    <g key={i} transform={`rotate(${arm.deg})`}>
                      <path d={`M0 -3 C${arm.len * 0.4} -7 ${arm.len * 0.7} 4 ${arm.len} -2 L${arm.len} 4 C${arm.len * 0.7} 9 ${arm.len * 0.4} 2 0 3Z`} />
                      <path d={`M${arm.len - 2} -3 l9 -5 l1 2 l-7 4 l10 -1 v2 l-10 1 l9 4 l-1 2 l-10 -4 l5 7 l-2 1 l-6 -7Z`} />
                    </g>
                  ))}
                </svg>
              </>
            )}
          </div>
          <div className="gate-doors">
            <div className="gate-leaf" data-side="left">
              <GateDoor door={DOOR_COUNT} side="left" lit={opening} wideOpen={opening} />
            </div>
            <div className="gate-leaf" data-side="right">
              <GateDoor door={DOOR_COUNT} side="right" lit={opening} wideOpen={opening} />
            </div>
          </div>
          <div className="gate-pillar gate-pillar--left" />
          <div className="gate-pillar gate-pillar--right" />
          <div className="gate-lintel">
            <span>ROSE</span>
          </div>
          {/* Changing `key` remounts the element, which restarts its CSS animation. */}
          <div className="gate-dust" key={`dust-${opening}`} aria-hidden="true">
            {DUST.map((grain, i) => (
              <i
                key={i}
                style={
                  {
                    left: `${grain.left}%`,
                    width: grain.size,
                    height: grain.size,
                    animationDelay: `${grain.delay}s`,
                    animationDuration: `${grain.duration}s`,
                    '--drift': `${grain.drift}px`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="gate-puff" key={`puff-${opening}`} aria-hidden="true" />
          <div className="gate-glow" />
        </div>
      </div>

      <div className="gate-ground">
        {truth && (
          <>
            <div className="gate-circle" />
            <svg className="truth-sparks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {SPARKS.map((spark, i) => (
                <path key={i} d={spark.d} className={spark.red ? 'is-red' : undefined} style={{ animationDelay: `${(i * 0.13).toFixed(2)}s` }} />
              ))}
            </svg>
          </>
        )}
      </div>
      <div className="gate-fog gate-fog--front" />
      <div className="gate-rays" />
    </div>
  )
}

export const ZoldyckGate = (props: SceneProps) => <DoorScene {...props} variant="zoldyck" />
export const GateOfTruth = (props: SceneProps) => <DoorScene {...props} variant="truth" />