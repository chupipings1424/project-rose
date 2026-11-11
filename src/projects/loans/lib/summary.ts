import type { Loan } from '../model'

export interface LoanSummary {
  /** What is still owed on loans that are not finished. */
  balance: number
  /** Everything paid so far, finished loans included. */
  paid: number
  /** The amortizations still being deducted each month. */
  monthly: number
  running: number
  completed: number
  /** The soonest next due date, or null when nothing is running. */
  nextDue: string | null
}

const sum = (values: number[]) => Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100

/** Totals for the stat tiles and the hub card - derived from the list, never stored. */
export function summarize(loans: Loan[]): LoanSummary {
  const running = loans.filter((l) => l.status !== 'completed')
  const dues = running.map((l) => l.nextDueDate).filter((d): d is string => d !== null)
  return {
    balance: sum(running.map((l) => l.balance)),
    paid: sum(loans.map((l) => l.paid)),
    monthly: sum(running.map((l) => l.monthlyAmortization)),
    running: running.length,
    completed: loans.length - running.length,
    // ISO dates (yyyy-MM-dd) sort correctly as plain text.
    nextDue: dues.sort()[0] ?? null,
  }
}
