import { describe, expect, it } from 'vitest'
import type { SavingsGoal } from '../model'
import { chartGeometry } from './chart'
import { runningTotals, summarize } from './summary'

const goal = (overrides: Partial<SavingsGoal>): SavingsGoal => ({
  id: 'g',
  name: 'Goal',
  icon: '',
  target: 1000,
  deadline: null,
  saved: 0,
  remaining: 1000,
  percent: 0,
  monthlyNeeded: null,
  estimatedFinish: null,
  status: 'no-deadline',
  entries: [],
  createdAt: '',
  updatedAt: '',
  ...overrides,
})

describe('summarize', () => {
  it('adds up every goal', () => {
    const summary = summarize([
      goal({ saved: 250, target: 1000, monthlyNeeded: 100 }),
      goal({ saved: 750, target: 500, status: 'done' }),
    ])
    expect(summary).toEqual({ totalSaved: 1000, totalTarget: 1500, percent: (1000 / 1500) * 100, active: 1, reached: 1, monthlyNeeded: 100 })
  })

  it('handles no goals', () => {
    expect(summarize([]).percent).toBe(0)
  })
})

describe('runningTotals', () => {
  it('keeps a running balance per day, oldest first', () => {
    const points = runningTotals([
      { id: '3', date: '2026-03-01', amount: -50, note: '' },
      { id: '1', date: '2026-01-01', amount: 100, note: '' },
      { id: '2', date: '2026-01-01', amount: 20.1, note: '' },
    ])
    expect(points).toEqual([
      { date: '2026-01-01', total: 120.1 },
      { date: '2026-03-01', total: 70.1 },
    ])
  })
})

describe('chartGeometry', () => {
  it('draws a step line scaled to the target', () => {
    const g = chartGeometry(
      [
        { date: '2026-01-01', total: 50 },
        { date: '2026-01-11', total: 100 },
      ],
      200,
      100,
      100,
    )
    expect(g.targetY).toBe(0)
    expect(g.line).toBe('M0,75 L100,75 L100,50')
    expect(g.last).toEqual({ x: 100, y: 50 })
  })

  it('is empty without points', () => {
    expect(chartGeometry([], 100, 10, 10).line).toBe('')
  })
})