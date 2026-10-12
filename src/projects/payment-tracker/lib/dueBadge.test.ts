import { describe, expect, it } from 'vitest'
import { dueBadge } from './dueBadge'

describe('dueBadge', () => {
  it.each([
    { remaining: 0, days_until_due: 5, label: 'Fully paid', tone: 'clear' },
    { remaining: 100, days_until_due: null, label: 'No due date set', tone: 'neutral' },
    { remaining: 100, days_until_due: -1, label: 'Overdue by 1 day', tone: 'overdue' },
    { remaining: 100, days_until_due: -3, label: 'Overdue by 3 days', tone: 'overdue' },
    { remaining: 100, days_until_due: 0, label: 'Due today', tone: 'overdue' },
    { remaining: 100, days_until_due: 1, label: 'Due in 1 day', tone: 'due' },
    { remaining: 100, days_until_due: 12, label: 'Due in 12 days', tone: 'due' },
  ] as const)('remaining=$remaining days=$days_until_due -> $label', ({ label, tone, ...summary }) => {
    expect(dueBadge(summary)).toEqual({ label, tone })
  })
})