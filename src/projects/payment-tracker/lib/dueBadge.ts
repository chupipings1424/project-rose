import type { Summary } from '../api/types'

export type DueTone = 'clear' | 'neutral' | 'overdue' | 'due'

export interface DueBadge {
  label: string
  tone: DueTone
}

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`

/** Pure function -> trivial to unit test (see dueBadge.test.ts). */
export function dueBadge(summary: Pick<Summary, 'remaining' | 'days_until_due'>): DueBadge {
  const { remaining, days_until_due: daysLeft } = summary
  if (remaining <= 0) return { label: 'Fully paid', tone: 'clear' }
  if (daysLeft === null) return { label: 'No due date set', tone: 'neutral' }
  if (daysLeft < 0) return { label: `Overdue by ${days(Math.abs(daysLeft))}`, tone: 'overdue' }
  if (daysLeft === 0) return { label: 'Due today', tone: 'overdue' }
  return { label: `Due in ${days(daysLeft)}`, tone: 'due' }
}