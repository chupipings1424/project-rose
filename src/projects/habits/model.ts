/**
 * Habits as the page sees them (camelCase). Streaks and "done today" are worked out by
 * the ROSE API (HabitRules.cs); api/client.ts converts the API's snake_case JSON.
 */

export type HabitKind = 'check' | 'count'

export interface Habit {
  id: string
  name: string
  icon: string
  /** check = done / not done; count = reach a daily target (e.g. 8 glasses). */
  kind: HabitKind
  /** Always 1 for check habits. */
  target: number
  /** e.g. "glasses". Empty for check habits. */
  unit: string
  /** "HH:mm" local time of the daily nudge, or null for none. */
  remindAt: string | null
  /** Amount done today. */
  today: number
  doneToday: boolean
  currentStreak: number
  bestStreak: number
  /** yyyy-MM-dd -> amount, for the last 13 weeks. Days with nothing done are missing. */
  log: Record<string, number>
  createdAt: string
  updatedAt: string
}

export interface HabitInput {
  name: string
  icon: string
  kind: HabitKind
  target: number
  unit: string
  remindAt: string | null
}

/** Today and the 6 days before it can be changed (the API enforces the same rule). */
export const EDITABLE_DAYS = 7

/** How many weeks the heatmap shows. */
export const HEATMAP_WEEKS = 12