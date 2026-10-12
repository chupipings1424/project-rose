import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { EntranceContext } from './entranceContext'
import { readGateMuted } from './gateConfig'
import { GateIntro } from './GateIntro'
import { playThud } from './gateSound'
import { shouldPlayGate } from './shouldPlayGate'

/** Owns the login entrance: any component can call useEntrance().open() / .deny(). */
export function EntranceProvider({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState(false)

  const open = useCallback(() => {
    if (shouldPlayGate()) setPlaying(true)
  }, [])

  const deny = useCallback(() => {
    if (!readGateMuted()) playThud()
  }, [])

  const finish = useCallback(() => setPlaying(false), [])

  const value = useMemo(() => ({ open, deny, playing }), [open, deny, playing])

  return (
    <EntranceContext.Provider value={value}>
      {children}
      {playing && <GateIntro onDone={finish} />}
    </EntranceContext.Provider>
  )
}