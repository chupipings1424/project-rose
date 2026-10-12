// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { collectDue, describeRepeat, nextOccurrence, parseReminderInput, type Reminder } from './reminders.ts'

// Local-time constructors keep these tests independent of the machine's time zone.
const at = (y: number, m: number, d: number, h = 9, min = 0) => new Date(y, m - 1, d, h, min)

function reminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'r1',
    text: 'Pay rent',
    dueAt: at(2026, 10, 12).toISOString(),
    repeat: 'none',
    weekDays: [],
    snoozedUntil: null,
    ringing: false,
    firedFor: null,
    lastFiredAt: null,
    done: false,
    createdAt: at(2026, 10, 1).toISOString(),
    updatedAt: at(2026, 10, 1).toISOString(),
    ...overrides,
  }
}

describe('nextOccurrence', () => {
  it('is null for one-off reminders', () => {
    expect(nextOccurrence(reminder(), at(2026, 10, 12, 10))).toBeNull()
  })

  it('daily keeps the time of day', () => {
    const r = reminder({ repeat: 'daily', dueAt: at(2026, 10, 12, 7, 30).toISOString() })
    expect(nextOccurrence(r, at(2026, 10, 12, 7, 30))).toEqual(at(2026, 10, 13, 7, 30))
    expect(nextOccurrence(r, at(2026, 10, 12, 6))).toEqual(at(2026, 10, 12, 7, 30))
  })

  it('weekdays skips the weekend', () => {
    // 16 Oct 2026 is a Friday
    const r = reminder({ repeat: 'weekdays', dueAt: at(2026, 10, 16).toISOString() })
    expect(nextOccurrence(r, at(2026, 10, 16, 9))).toEqual(at(2026, 10, 19))
  })

  it('weekly rings only on the chosen days', () => {
    // Monday 12 Oct; pick Monday + Thursday
    const r = reminder({ repeat: 'weekly', weekDays: [1, 4] })
    expect(nextOccurrence(r, at(2026, 10, 12, 9))).toEqual(at(2026, 10, 15))
    expect(nextOccurrence(r, at(2026, 10, 15, 9))).toEqual(at(2026, 10, 19))
  })

  it('monthly on the 31st falls back to the last day of short months', () => {
    const r = reminder({ repeat: 'monthly', dueAt: at(2026, 1, 31).toISOString() })
    expect(nextOccurrence(r, at(2026, 1, 31, 9))).toEqual(at(2026, 2, 28))
  })
})

describe('collectDue', () => {
  it('rings a one-off once and remembers it', () => {
    const r = reminder()
    expect(collectDue([r], at(2026, 10, 12, 8, 59))).toHaveLength(0)
    expect(collectDue([r], at(2026, 10, 12, 9))).toEqual([r])
    expect(r).toMatchObject({ ringing: true, firedFor: r.dueAt })
    expect(collectDue([r], at(2026, 10, 12, 9, 1))).toHaveLength(0)
  })

  it('moves a repeating reminder to its next time', () => {
    const r = reminder({ repeat: 'daily' })
    collectDue([r], at(2026, 10, 12, 9, 0))
    expect(r.dueAt).toBe(at(2026, 10, 13).toISOString())
    expect(r.ringing).toBe(true)
  })

  it('catches up only once after the PC was off for days', () => {
    const r = reminder({ repeat: 'daily' })
    expect(collectDue([r], at(2026, 10, 15, 12))).toHaveLength(1)
    expect(r.dueAt).toBe(at(2026, 10, 16).toISOString())
  })

  it('rings again when a snooze ends, and never for finished reminders', () => {
    const snoozed = reminder({ firedFor: reminder().dueAt, snoozedUntil: at(2026, 10, 12, 9, 10).toISOString() })
    const done = reminder({ id: 'r2', done: true })
    expect(collectDue([snoozed, done], at(2026, 10, 12, 9, 10))).toEqual([snoozed])
    expect(snoozed.snoozedUntil).toBeNull()
  })
})

describe('parseReminderInput', () => {
  it('cleans valid input', () => {
    const result = parseReminderInput({ text: '  Gym ', dueAt: '2026-10-12T01:00:00.000Z', repeat: 'weekly', weekDays: [4, 1, 1, 9] })
    expect(result).toEqual({
      ok: true,
      value: { text: 'Gym', dueAt: '2026-10-12T01:00:00.000Z', repeat: 'weekly', weekDays: [1, 4] },
    })
  })

  it.each([
    [null, 'Expected a JSON object.'],
    [{ text: '', dueAt: '2026-10-12' }, 'Write what to remind you about.'],
    [{ text: 'x', dueAt: 'soon' }, 'Pick a valid date and time.'],
    [{ text: 'x', dueAt: '2026-10-12', repeat: 'hourly' }, 'Unknown repeat rule.'],
    [{ text: 'x', dueAt: '2026-10-12', repeat: 'weekly', weekDays: [] }, 'Pick at least one weekday.'],
  ])('rejects %j', (body, error) => {
    expect(parseReminderInput(body)).toEqual({ ok: false, error })
  })
})

it('describes repeat rules for people', () => {
  expect(describeRepeat(reminder())).toBe('Once')
  expect(describeRepeat(reminder({ repeat: 'weekly', weekDays: [4, 1] }))).toBe('Every Mon, Thu')
  expect(describeRepeat(reminder({ repeat: 'monthly' }))).toBe('Monthly on day 12')
})