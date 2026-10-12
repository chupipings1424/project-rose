import type { CSSProperties } from 'react'
import { RAIN } from '../gateScenery'
import { DECODE_REELS } from './sceneData'
import './matrix.css'

/** Matrix: ROSE decrypts out of the code rain, then the camera dives into the code. */
export function MatrixScene() {
  return (
    <div className="scene matrix-scene" aria-hidden="true">
      <div className="matrix-dive">
        <div className="matrix-rain">
          {RAIN.map((column, i) => (
            <span
              key={i}
              style={{ left: `${column.left}%`, animationDelay: `${column.delay}s`, animationDuration: `${column.duration}s` }}
            >
              {column.text}
            </span>
          ))}
        </div>
      </div>
      <div className="matrix-word">
        {DECODE_REELS.map((reel, i) => (
          <span key={i} className="matrix-cell" style={{ '--k': 0.2 + i * 0.05 } as CSSProperties}>
            <span className="matrix-reel">
              {reel.map((glyph, j) => (
                <b key={j}>{glyph}</b>
              ))}
            </span>
          </span>
        ))}
      </div>
      <div className="matrix-scan" />
    </div>
  )
}