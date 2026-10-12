import type { CSSProperties } from 'react'
import { DEBRIS, KI_PARTICLES, MESAS, auraPath, boltPath } from './sceneData'
import './kamehameha.css'

const AURA = [auraPath(1), auraPath(2), auraPath(3)]
const BOLTS = [boltPath(4, 30, 10, 42, 60), boltPath(5, 72, 18, 60, 70), boltPath(6, 20, 55, 38, 92), boltPath(7, 80, 50, 64, 90)]

/**
 * Dragon Ball Super: a Super Saiyan aura flares up, ki gathers into a blue
 * ball between the hands... and the Kamehameha fires and fills the screen.
 */
export function KamehamehaScene() {
  return (
    <div className="scene kame-scene" aria-hidden="true">
      <div className="kame-sky" />
      <div className="kame-dragonball" />
      <svg className="scene-horizon kame-mesas" viewBox="0 0 1600 300" preserveAspectRatio="none">
        <path d={MESAS} />
      </svg>
      <div className="kame-ground" />
      <div className="kame-shake">
        <div className="kame-power">
          <svg className="kame-aura" viewBox="0 0 200 300" preserveAspectRatio="none">
            {AURA.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </svg>
          <svg className="kame-bolts" viewBox="0 0 100 100" preserveAspectRatio="none">
            {BOLTS.map((d, i) => (
              <path key={i} d={d} style={{ animationDelay: `${i * 70}ms` }} />
            ))}
          </svg>
          <div className="kame-ki">
            {KI_PARTICLES.map((p, i) => (
              <i key={i} style={{ '--x': `${p.x}vmin`, '--y': `${p.y}vmin`, animationDelay: `${p.delay}s` } as CSSProperties} />
            ))}
          </div>
          <div className="kame-ball" />
        </div>
        <div className="kame-beam" />
      </div>
      <div className="kame-debris">
        {DEBRIS.map((rock, i) => (
          <i
            key={i}
            style={
              {
                left: `${rock.left}%`,
                width: rock.size,
                height: rock.size * 0.8,
                animationDelay: `${rock.delay}s`,
                '--rise': `${rock.rise}vh`,
                '--spin': `${rock.spin}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  )
}