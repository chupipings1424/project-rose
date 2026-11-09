/**
 * The three things quick add (and the command bar) can save, described as outbox
 * requests. Keeping them here means the forms and the voice/text commands build
 * exactly the same request.
 */
import type { OutboxRequest } from '../lib/outbox'
import { REMINDERS_API, toDto } from '../projects/reminders/api/client'
import type { ReminderInput } from '../projects/reminders/model'
import { API_BASE } from '../projects/workbook/api/client'
import type { NewPaymentPayload } from '../projects/workbook/api/types'

type Money = (value: number | string) => string

const DOT = ' \u00b7 '

/** The toast after a save that is waiting in the outbox. */
export const QUEUED_MESSAGE = "Saved on this phone - it will sync when you're back online"

export function paymentRequest(payload: NewPaymentPayload, money: Money): OutboxRequest {
  return {
    kind: 'payment',
    label: ['Payment', payload.title, money(payload.amount), payload.status].join(DOT),
    url: `${API_BASE}/payments`,
    body: payload,
  }
}

/** POST budget/expenses: adds to the line with this name (or makes one) for the date's month. */
export interface ExpenseInput {
  item: string
  group: string
  amount: string
  /** yyyy-mm-dd - the day it was spent, so a late sync still lands in the right month. */
  date: string
}

/** What the API answers (snake_case). */
export interface ExpenseAdded {
  line_id: string
  item: string
  group: string
  year: number
  month: number
  month_total: number
  created_line: boolean
}

export function expenseRequest(input: ExpenseInput, money: Money): OutboxRequest {
  return {
    kind: 'expense',
    label: ['Expense', input.item, money(input.amount)].join(DOT),
    url: `${API_BASE}/budget/expenses`,
    body: input,
  }
}

export function reminderRequest(input: ReminderInput): OutboxRequest {
  const when = new Date(input.dueAt).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return {
    kind: 'reminder',
    label: ['Reminder', input.text, when].join(DOT),
    url: `${REMINDERS_API}/items`,
    body: toDto(input),
  }
}