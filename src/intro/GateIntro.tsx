import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { SoundIcon } from '../components/icons'
import { GateDoor } from './GateDoor'
import { ARRIVE_MS, DOOR_COUNT, GATE_MUTE_KEY, OPEN_MS, SKIP_MS, readGateMuted } from './gateConfig'
import { DUST, FOREST_FAR, FOREST_NEAR } from './gateScenery'
import { createGateSound, type GateSound } from './gateSound'
import './gate.css'

type Phase = 'arrive' | 'opening' | 'leaving'

/**
 * The entrance after a successful login: a giant stone gate with seven nested
 * doors lands over the login page, its numbers light up, and it swings open
 * while the camera flies through into the app.
 *
 * It is a small state machine driven by timers: arrive -> opening -> done
 * (or -> leaving -> done when skipped). All the motion itself is CSS; React
 * only flips `data-phase` and CSS animations/transitions react to it.
 */
export function GateIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('arrive')
  const [muted, setMuted] = useState(readGateMuted)
  const soundRef = useRef<GateSound | null>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  // While the gate is up, the app behind it can't be focused or clicked.
  useEffect(() => {
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    skipRef.current?.focus()
    return () => root?.removeAttribute('inert')
  }, [])

  // Sound: the login click a moment ago counts as the user gesture browsers require.
  useEffect(() => {
    const sound = createGateSound(readGateMuted())
    soundRef.current = sound
    sound?.resume()
    sound?.doorClosed()
    sound?.setPush(0.5, true)
    return () => sound?.dispose()
  }, [])

  useEffect(() => {
    soundRef.current?.setMuted(muted)
    try {
      localStorage.setItem(GATE_MUTE_KEY, muted ? '1' : '0')
    } catch {
      // not fatal: the choice just won't be remembered
    }
  }, [muted])

  // The timeline.
  useEffect(() => {
    if (phase === 'arrive') {
      const id = window.setTimeout(() => {
        soundRef.current?.gateOpened()
        setPhase('opening')
      }, ARRIVE_MS)
      return () => window.clearTimeout(id)
    }
    const id = window.setTimeout(() => onDoneRef.current(), phase === 'opening' ? OPEN_MS : SKIP_MS)
    return () => window.clearTimeout(id)
  }, [phase])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        soundRef.current?.quiet()
        setPhase('leaving')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const skip = () => {
    soundRef.current?.quiet()
    setPhase('leaving')
  }

  const wideOpen = phase === 'opening'

  return createPortal(
    <div
      className="gate"
      data-phase={phase}
      style={{ '--door': wideOpen ? DOOR_COUNT : 0 } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
    >
      <div className="gate-world">
        <div className="gate-sky" />
        <div className="gate-moon" />
        <svg className="gate-forest gate-forest--far" viewBox="0 0 1600 300" preserveAspectRatio="none" aria-hidden="true">
          <path d={FOREST_FAR} />
        </svg>
        <svg className="gate-forest gate-forest--near" viewBox="0 0 1600 300" preserveAspectRatio="none" aria-hidden="true">
          <path d={FOREST_NEAR} />
        </svg>
        <div className="gate-fog gate-fog--back" />

        <div className="gate-wall">
          <div className="gate-wall__cap" />
          <div className="gate-portal">
            <div className="gate-beyond" />
            <div className="gate-doors">
              <div className="gate-leaf" data-side="left">
                <GateDoor door={DOOR_COUNT} side="left" lit={wideOpen} wideOpen={wideOpen} />
              </div>
              <div className="gate-leaf" data-side="right">
                <GateDoor door={DOOR_COUNT} side="right" lit={wideOpen} wideOpen={wideOpen} />
              </div>
            </div>
            <div className="gate-pillar gate-pillar--left" />
            <div className="gate-pillar gate-pillar--right" />
            <div className="gate-lintel">
              <span>ROSE</span>
            </div>
            {/* Changing `key` remounts the element, which restarts its CSS animation. */}
            <div className="gate-dust" key={`dust-${wideOpen}`} aria-hidden="true">
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
            <div className="gate-puff" key={`puff-${wideOpen}`} aria-hidden="true" />
            <div className="gate-glow" />
          </div>
        </div>

        <div className="gate-ground" />
        <div className="gate-fog gate-fog--front" />
        <div className="gate-rays" />
      </div>

      <div className="gate-vignette" />
      <div className="gate-flash" />

      <header className="gate-hud">
        <p className="gate-eyebrow">Project ROSE</p>
        <h1 className="gate-title" id="gate-title">
          Access granted
        </h1>
        <p className="gate-sub" aria-live="polite">
          {phase === 'arrive' ? 'The gate recognises you\u2026' : 'Opening the gate'}
        </p>
      </header>

      <div className="gate-controls">
        <button
          type="button"
          className="gate-chip"
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          onClick={() => setMuted((m) => !m)}
        >
          <SoundIcon muted={muted} />
        </button>
        <button ref={skipRef} type="button" className="gate-chip" onClick={skip}>
          Skip
        </button>
      </div>
    </div>,
    document.body,
  )
}