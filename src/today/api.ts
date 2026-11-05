import { requestJson } from '../api/http'

/**
 * GET /api/today - everything the Today page shows, in one request.
 * The API sends snake_case; these types describe that wire format directly
 * because only the Today page reads them.
 */
export const TODAY_API = '/api/today'

export interface TodayBudget {
  year: number
  /** 0 (Jan) to 11 (Dec). */
  month: number
  month_name: string
  revenue: number
  expenses: number
  /** Revenue minus expenses this month. */
  left: number
}

export interface TodayPayment {
  id: string
  title: string
  amount: number
  due_date: string
  /** Negative = overdue by that many days. */
  days_until_due: number
}

export interface TodayReminder {
  id: string
  text: string
  due_at: string
  ringing: boolean
  overdue: boolean
}

export interface TodayHabit {
  id: string
  name: string
  icon: string
  kind: 'check' | 'count'
  /** Amount done today (0/1 for check habits). */
  done: number
  target: number
  unit: string
  done_today: boolean
}

export interface TodayView {
  date: string
  budget: TodayBudget
  payments: TodayPayment[]
  reminders: TodayReminder[]
  habits: TodayHabit[]
}

export const todayApi = {
  get: () => requestJson<TodayView>(TODAY_API),
}

/** "Overdue 3 days", "Due today", "Tomorrow", "In 5 days" */
export function dueLabel(days: number): string {
  if (days < 0) return `Overdue ${-days} day${days === -1 ? '' : 's'}`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}