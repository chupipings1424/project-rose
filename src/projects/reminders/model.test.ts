import { describe, expect, it } from 'vitest'
import { describeRepeat } from './model'

const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).toISOString()

describe('describeRepeat', () => {
  it('describes each rule', () => {
    const dueAt = at(2026, 10, 12) // a Monday
    expect(describeRepeat({ repeat: 'none', weekDays: [], dueAt })).toBe('Once')
    expect(describeRepeat({ repeat: 'daily', weekDays: [], dueAt })).toBe('Every day')
    expect(describeRepeat({ repeat: 'weekdays', weekDays: [], dueAt })).toBe('Every weekday')
    expect(describeRepeat({ repeat: 'weekly', weekDays: [4, 1], dueAt })).toBe('Every Mon, Thu')
    expect(describeRepeat({ repeat: 'monthly', weekDays: [], dueAt })).toBe('Monthly on day 12')
  })

  it('falls back to the due date weekday for weekly without days', () => {
    expect(describeRepeat({ repeat: 'weekly', weekDays: [], dueAt: at(2026, 10, 12) })).toBe('Every Mon')
  })
})