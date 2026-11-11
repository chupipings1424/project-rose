/**
 * Loans as the page sees them (camelCase). Nothing about payments is stored: the ROSE API
 * (LoanRules.cs) counts every due date that has arrived as paid and sends the balance,
 * next due date, finish date and schedule ready-made. api/client.ts converts its snake_case JSON.
 */

/** The same list as LoanRules.Types in the API. */
export const LOAN_TYPES = ['Coop', 'Pag-IBIG', 'SSS', 'GSIS', 'Bank', 'Salary loan', 'Personal', 'Other'] as const

export type LoanStatus = 'not-started' | 'active' | 'completed'

export interface LoanInstalment {
  number: number
  /** yyyy-MM-dd */
  dueDate: string
  amount: number
  /** What is left once this payment is made. */
  balanceAfter: number
  paid: boolean
}

export interface Loan {
  id: string
  name: string
  type: string
  /** yyyy-MM-dd. Payments fall on this day of every following month. */
  loanDate: string
  /** Number of monthly payments. */
  term: number
  monthlyAmortization: number
  /** The amount borrowed. */
  amount: number
  /** Monthly amortization x term. */
  totalPayable: number
  /** Total payable - amount borrowed. */
  interest: number
  paymentsMade: number
  paymentsLeft: number
  paid: number
  balance: number
  /** 0 - 100 */
  percent: number
  lastPaymentDate: string | null
  nextDueDate: string | null
  finishDate: string
  status: LoanStatus
  schedule: LoanInstalment[]
  createdAt: string
  updatedAt: string
}

export interface LoanInput {
  name: string
  type: string
  loanDate: string
  term: number
  monthlyAmortization: number
  amount: number
}

export const STATUS_LABELS: Record<LoanStatus, string> = {
  'not-started': 'Not started',
  active: 'Paying',
  completed: 'Completed',
}
