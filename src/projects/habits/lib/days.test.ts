import { describe, expect, it } from 'vitest'
import { addDays, heatmapWeeks, intensity, lastDays } from './days'

describe('days', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('lists the last 7 days oldest first', () => {
    expect(lastDays('2026-11-10', 7)).toEqual([
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
    ])
  })

  it('builds Monday-first weeks ending with the current week', () => {
    // 2026-11-10 is a Tuesday.
    const weeks = heatmapWeeks('2026-11-10', 12)
    expect(weeks).toHaveLength(12)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[11][0]).toEqual({ date: '2026-11-09', future: false })
    expect(weeks[11][1]).toEqual({ date: '2026-11-10', future: false })
    expect(weeks[11][2]).toEqual({ date: '2026-11-11', future: true })
    expect(weeks[0][0].date).toBe('2026-08-24')
  })

  it('handles a Sunday as the last day of the week', () => {
    const weeks = heatmapWeeks('2026-11-15', 2)
    expect(weeks[1][6]).toEqual({ date: '2026-11-15', future: false })
  })

  it('maps progress to five shades', () => {
    expect(intensity(0, 8)).toBe(0)
    expect(intensity(1, 8)).toBe(1)
    expect(intensity(4, 8)).toBe(2)
    expect(intensity(7, 8)).toBe(3)
    expect(intensity(8, 8)).toBe(4)
    expect(intensity(12, 8)).toBe(4)
  })
})