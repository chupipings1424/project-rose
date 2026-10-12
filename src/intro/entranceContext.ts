import { createContext } from 'react'

export interface EntranceContextValue {
  /** Play the gate opening (after a successful login). */
  open: () => void
  /** The gate refuses you: a heavy stone thud (after a wrong token). */
  deny: () => void
  /** True while the gate animation is on screen. */
  playing: boolean
}

export const EntranceContext = createContext<EntranceContextValue | null>(null)