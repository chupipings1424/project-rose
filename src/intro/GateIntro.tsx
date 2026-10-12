import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { SoundIcon } from '../components/icons'
import { ARRIVE_MS, GATE_MUTE_KEY, OPEN_MS, SKIP_MS, readGateMuted } from './gateConfig'
import { GATE_SKINS, currentGateSkin } from './gateSkins'
import { createGateSound, type GateSound } from './gateSound'
import { SCENES } from './scenes'
import './gate.css'

type Phase = 'arrive' | 'opening' | 'leaving'

/**
 * The entrance after a successful login. Every theme plays its own scene:
 * the Zoldyck gate swings open, a Sharingan spins, a Kamehameha fires...
 *
 * This component is the shell they share: a small state machine driven by
 * timers (arrive -> opening -> done, or -> leaving -> done when skipped), the
 * title, the Skip and sound buttons, the closing flash and the sound. The
 * picture itself comes from scenes/index.ts, and all the motion is CSS:
 * React only flips `data-phase`, and `--scene-t` tells the scenes how long
 * the whole entrance lasts so they can run one timeline from start to end.
 */export function GateIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('arrive')
  const [muted, setMuted] = useState(readGateMuted)
  // Read once: the theme can't change while the gate is up.
  const [skin] = useState(currentGateSkin)
  const look = GATE_SKINS[skin]
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
    const sound = createGateSound(readGateMuted(), GATE_SKINS[currentGateSkin()].sound)
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

  const Scene = SCENES[skin]

  return createPortal(
    <div
      className="gate"
      data-phase={phase}
      data-skin={skin}
      style={{ '--scene-t': `${ARRIVE_MS + OPEN_MS}ms` } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
    >
      <Scene opening={phase === 'opening'} />
      <div className="gate-vignette" />
      <div className="gate-flash" />

      <header className="gate-hud">
        <p className="gate-eyebrow">Project ROSE</p>
        <h1 className="gate-title" id="gate-title">
          Access granted
        </h1>
        <p className="gate-sub" aria-live="polite">
          {phase === 'arrive' ? look.lines[0] : look.lines[1]}
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