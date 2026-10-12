// Timings and geometry for the entrance gate. No React, no DOM.

export const DOOR_COUNT = 7

/**
 * Size of each nested door as a fraction of one full leaf. Door 1 is the small
 * door at the bottom of the seam; door 7 is the whole leaf. Each bigger door
 * contains all the smaller ones, like the Zoldyck Testing Gate.
 */
export const DOOR_SIZES = [
  { w: 0.36, h: 0.22 },
  { w: 0.46, h: 0.33 },
  { w: 0.56, h: 0.45 },
  { w: 0.66, h: 0.57 },
  { w: 0.76, h: 0.69 },
  { w: 0.87, h: 0.83 },
  { w: 1, h: 1 },
] as const satisfies readonly { w: number; h: number }[]

/** The gate fades in over the login page and lands with a thud. */
export const ARRIVE_MS = 550
/** The doors swing wide, light floods out and the camera flies through. */
export const OPEN_MS = 2200
/** Fade-out when the entrance is skipped. */
export const SKIP_MS = 450

export const GATE_MUTE_KEY = 'rose.gate.muted'

export function readGateMuted(): boolean {
  try {
    return localStorage.getItem(GATE_MUTE_KEY) === '1'
  } catch {
    return false
  }
}