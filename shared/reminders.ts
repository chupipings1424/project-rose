/**
 * Reminder types and scheduling rules, shared by the worker (server/) and the
 * React page (src/). Pure functions only: no I/O, no clocks - `now` is passed in,
 * which makes every rule easy to unit test.
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

const DAY_MS = 86_400_000

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Does this calendar day count for the rule? (`date` carries the day; the time is ignored.) */
function dayMatches(rule: RepeatRule, weekDays: number[], anchor: Date, date: Date): boolean {
  switch (rule) {
    case 'daily':
      return true
    case 'weekdays':
      return date.getDay() >= 1 && date.getDay() <= 5
    case 'weekly':
      return (weekDays.length ? weekDays : [anchor.getDay()]).includes(date.getDay())
    case 'monthly':
      // The 31st rings on the last day of shorter months instead of skipping them.
      return date.getDate() === Math.min(anchor.getDate(), daysInMonth(date.getFullYear(), date.getMonth()))
    case 'none':
      return false
  }
}

/**
 * The first time strictly after `after` that a repeating reminder should ring,
 * keeping the original time of day. Returns null for one-off reminders.
 */
export function nextOccurrence(
  reminder: Pick<Reminder, 'dueAt' | 'repeat' | 'weekDays'>,
  after: Date,
): Date | null {
  if (reminder.repeat === 'none') return null
  const anchor = new Date(reminder.dueAt)
  const candidate = new Date(after)
  candidate.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0)
  // At most ~31 days ahead for any rule; 400 is a generous safety net.
  for (let i = 0; i < 400; i++) {
    if (candidate.getTime() > after.getTime() && dayMatches(reminder.repeat, reminder.weekDays, anchor, candidate)) {
      return candidate
    }
    // setDate keeps the local time of day, even across daylight-saving changes.
    candidate.setDate(candidate.getDate() + 1)
  }
  return new Date(after.getTime() + DAY_MS)
}

/**
 * One scheduler step. Returns the reminders that must ring now and mutates them:
 * one-offs remember they fired, repeating ones jump to their next occurrence.
 */
export function collectDue(reminders: Reminder[], now: Date): Reminder[] {
  const fired: Reminder[] = []
  const nowIso = now.toISOString()
  for (const reminder of reminders) {
    if (reminder.done) continue
    let ring = false

    if (reminder.snoozedUntil && Date.parse(reminder.snoozedUntil) <= now.getTime()) {
      reminder.snoozedUntil = null
      ring = true
    }

    if (Date.parse(reminder.dueAt) <= now.getTime() && reminder.firedFor !== reminder.dueAt) {
      ring = true
      const next = nextOccurrence(reminder, now)
      if (next) reminder.dueAt = next.toISOString()
      else reminder.firedFor = reminder.dueAt
    }

    if (ring) {
      reminder.ringing = true
      reminder.lastFiredAt = nowIso
      reminder.updatedAt = nowIso
      fired.push(reminder)
    }
  }
  return fired
}

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

/** Validates untrusted input (an HTTP body) and returns a clean copy or an error message. */
export function parseReminderInput(body: unknown): { ok: true; value: ReminderInput } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Expected a JSON object.' }
  const raw = body as Record<string, unknown>
  const text = typeof raw.text === 'string' ? raw.text.trim() : ''
  if (!text) return { ok: false, error: 'Write what to remind you about.' }
  if (text.length > 200) return { ok: false, error: 'Keep the reminder under 200 characters.' }
  if (typeof raw.dueAt !== 'string' || Number.isNaN(Date.parse(raw.dueAt))) {
    return { ok: false, error: 'Pick a valid date and time.' }
  }
  const repeat = raw.repeat ?? 'none'
  if (!REPEAT_RULES.includes(repeat as RepeatRule)) return { ok: false, error: 'Unknown repeat rule.' }
  const weekDays = Array.isArray(raw.weekDays)
    ? [...new Set(raw.weekDays.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
    : []
  if (repeat === 'weekly' && weekDays.length === 0) return { ok: false, error: 'Pick at least one weekday.' }
  return {
    ok: true,
    value: { text, dueAt: new Date(raw.dueAt).toISOString(), repeat: repeat as RepeatRule, weekDays },
  }
}