import { describe, expect, it } from 'vitest'
import type { Loan } from '../model'
import { summarize } from './summary'

const loan = (overrides: Partial<Loan>): Loan => ({
  id: 'l1',
  name: 'Coop',
  type: 'Coop',
  loanDate: '2026-04-02',
  term: 24,
  monthlyAmortization: 500,
  amount: 10000,
  totalPayable: 12000,
  interest: 2000,
  paymentsMade: 7,
  paymentsLeft: 17,
  paid: 3500,
  balance: 8500,
  percent: 29.2,
  lastPaymentDate: '2026-11-02',
  nextDueDate: '2026-12-02',
  finishDate: '2028-04-02',
  status: 'active',
  schedule: [],
  createdAt: '',
  updatedAt: '',
  ...overrides,
})

describe('summarize', () => {
  it('adds up running loans and counts finished ones only as paid', () => {
    const summary = summarize([
      loan({}),
      loan({ id: 'l2', balance: 1000.1, monthlyAmortization: 250.2, paid: 0, nextDueDate: '2026-11-20' }),
      loan({ id: 'l3', status: 'completed', balance: 0, paid: 6000, nextDueDate: null }),
    ])

    expect(summary).toEqual({
      balance: 9500.1,
      paid: 9500,
      monthly: 750.2,
      running: 2,
      completed: 1,
      nextDue: '2026-11-20',
    })
  })

  it('has no next due date without running loans', () => {
    expect(summarize([]).nextDue).toBeNull()
  })
})
