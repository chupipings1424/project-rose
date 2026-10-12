/**
 * The reminder model as the page sees it (camelCase). The scheduling rules
 * themselves live in the ROSE API (project-rose-api); api/client.ts converts
 * between this shape and the API's snake_case JSON.
 */

export const REPEAT_RULES = ['none', 'daily', 'weekdays', 'weekly', 'monthly'] as const
export type RepeatRule = (typeof REPEAT_RULES)[number]

export interface Reminder {
  id: string
  text: string
  /** Next time this reminder rings (ISO). Repeating reminders move it forward after each ring. */
  dueAt: string
  repeat: RepeatRule
  /** For `weekly`: which weekdays, 0 = Sunday ... 6 = Saturday. */
  weekDays: number[]
  /** A one-off "ring again at" time set by snooze. */
  snoozedUntil: string | null
  /** True after it rang, until you snooze, finish or dismiss it. */
  ringing: boolean
  /** One-off reminders only: the dueAt that already rang, so it never rings twice. */
  firedFor: string | null
  lastFiredAt: string | null
  done: boolean
  createdAt: string
  updatedAt: string
}

/** What the page sends when creating or editing a reminder. */
export interface ReminderInput {
  text: string
  dueAt: string
  repeat: RepeatRule
  weekDays?: number[]
}

export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** "Every weekday", "Every Mon, Thu", ... for the UI. */
export function describeRepeat(reminder: Pick<Reminder, 'repeat' | 'weekDays' | 'dueAt'>): string {
  switch (reminder.repeat) {
    case 'none':
      return 'Once'
    case 'daily':
      return 'Every day'
    case 'weekdays':
      return 'Every weekday'
    case 'weekly': {
      const days = reminder.weekDays.length ? reminder.weekDays : [new Date(reminder.dueAt).getDay()]
      return `Every ${[...days].sort().map((d) => WEEKDAY_NAMES[d]).join(', ')}`
    }
    case 'monthly':
      return `Monthly on day ${new Date(reminder.dueAt).getDate()}`
  }
}