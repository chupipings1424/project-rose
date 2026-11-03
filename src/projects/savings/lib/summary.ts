import type { SavingsEntry, SavingsGoal } from '../model'

export interface SavingsSummary {
  totalSaved: number
  totalTarget: number
  /** Saved across every goal, 0 - 100. */
  percent: number
  active: number
  reached: number
  /** Sum of every goal's "per month" amount. */
  monthlyNeeded: number
}

/**
 * Derived state: numbers worked out from the goals instead of being stored.
 * Pure, so the component can wrap it in useMemo and the test can call it directly.
 */
export function summarize(goals: SavingsGoal[]): SavingsSummary {
  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)
  const reached = goals.filter((g) => g.status === 'done').length
  return {
    totalSaved,
    totalTarget,
    percent: totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0,
    active: goals.length - reached,
    reached,
    monthlyNeeded: goals.reduce((sum, g) => sum + (g.monthlyNeeded ?? 0), 0),
  }
}

export interface ChartPoint {
  /** yyyy-MM-dd */
  date: string
  total: number
}

/** The balance after each day that has entries, oldest first. */
export function runningTotals(entries: SavingsEntry[]): ChartPoint[] {
  const byDay = new Map<string, number>()
  for (const entry of entries) byDay.set(entry.date, (byDay.get(entry.date) ?? 0) + entry.amount)

  let total = 0
  return [...byDay.keys()].sort().map((date) => {
    total += byDay.get(date)!
    return { date, total: Math.round(total * 100) / 100 }
  })
}