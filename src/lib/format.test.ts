import { describe, expect, it } from 'vitest'
import { longDate, nowTime, parseIsoDate, shortDate, todayIso } from './format'

describe('parseIsoDate', () => {
  it('reads an ISO date as a local calendar date', () => {
    const date = parseIsoDate('2026-10-07')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(9) // months are 0-based
    expect(date?.getDate()).toBe(7)
  })

  it.each([undefined, null, '', 'not a date'])('returns null for %s', (value) => {
    expect(parseIsoDate(value)).toBeNull()
  })
})

describe('date labels', () => {
  it('show a dash when there is no date', () => {
    expect(longDate('')).toBe('—')
    expect(shortDate(null)).toBe('—')
  })

  it('format real dates', () => {
    expect(longDate('2026-10-07')).toContain('2026')
    expect(shortDate('2026-10-07')).toContain('2026')
  })
})

describe('todayIso / nowTime', () => {
  it('pad single digits', () => {
    const when = new Date(2026, 0, 5, 9, 3)
    expect(todayIso(when)).toBe('2026-01-05')
    expect(nowTime(when)).toBe('09:03')
  })
})