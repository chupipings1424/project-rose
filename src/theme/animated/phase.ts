export type DayPhase = 'dawn' | 'day' | 'sunset' | 'night'

/**
 * The Day / Night theme's look for a clock hour (0-23).
 * Keep in sync with the copy in index.html, which runs before React to avoid a flash.
 */
export function phaseOf(hour: number): DayPhase {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 17) return 'day'
  if (hour >= 17 && hour < 19) return 'sunset'
  return 'night'
}