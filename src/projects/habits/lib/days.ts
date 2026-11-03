import { parseIsoDate, todayIso } from '../../../lib/format'

/** Adds whole days to a yyyy-MM-dd date (local time, so DST never shifts the day). */
export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso)
  if (!date) throw new Error(`Not a date: ${iso}`)
  date.setDate(date.getDate() + days)
  return todayIso(date)
}

/** The last `count` days ending with `today`, oldest first. */
export function lastDays(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)))
}

export interface HeatCell {
  date: string
  future: boolean
}

/**
 * `weeks` columns of 7 days (Monday to Sunday), the last column being the week that
 * contains `today`. Days after today are marked `future` so they can be drawn empty.
 */
export function heatmapWeeks(today: string, weeks: number): HeatCell[][] {
  const weekday = parseIsoDate(today)?.getDay() ?? 1
  const sinceMonday = (weekday + 6) % 7 // Sunday is 0 in JS; make Monday the first row
  const start = addDays(today, -sinceMonday - (weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = addDays(start, week * 7 + day)
      return { date, future: date > today }
    }),
  )
}

export type Intensity = 0 | 1 | 2 | 3 | 4

/** 0 = nothing, 1-3 = part of the target, 4 = target reached. */
export function intensity(value: number, target: number): Intensity {
  if (value <= 0) return 0
  if (value >= target) return 4
  return Math.min(3, Math.max(1, Math.ceil((value / target) * 3))) as Intensity
}

/** "Mon" */
export const weekdayShort = (iso: string) =>
  parseIsoDate(iso)?.toLocaleDateString('en-US', { weekday: 'short' }) ?? ''

/** "Monday, Nov 10" */
export const dayLabel = (iso: string) =>
  parseIsoDate(iso)?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) ?? iso