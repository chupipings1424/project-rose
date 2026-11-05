import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/toast/ToastProvider'
import { DATA_CHANGED_EVENT } from '../lib/dataEvents'
import QuickAddDialog from './QuickAddDialog'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const month = new Date().getMonth()
const year = new Date().getFullYear()

const budget = () => {
  const amounts = Array<number>(12).fill(0)
  amounts[month] = 100
  const line = { id: 'l1', year, section: 'Expense', group: 'Food', item: 'Groceries', amounts, total: 100, notes: '' }
  return {
    year,
    months: MONTHS,
    sections: [
      { name: 'Revenue', label: 'Revenue', groups: [], monthly: [], total: 0 },
      { name: 'Expense', label: 'Expenses', groups: [{ name: 'Food', lines: [line], monthly: amounts, total: 100 }], monthly: amounts, total: 100 },
    ],
    known_groups: { Revenue: ['Salary'], Expense: ['Food', 'Loans'] },
    total_revenue: 0,
    total_expenses: 100,
    net: -100,
    net_by_month: [],
    line_count: 1,
    years: [year],
  }
}

const sent = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body))

describe('QuickAddDialog', () => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/payment-tracker/accounts') return json([{ title: 'Car Loan' }, { title: 'Phone' }])
    if (url === '/api/payment-tracker/summary/Car%20Loan')
      return json({ title: 'Car Loan', has_plan: true, per_payment: 500, next_due_date: '2026-12-01' })
    if (url === '/api/payment-tracker/payments' && method === 'POST') return json({ id: 'p9', settled: true, summary: {} }, 201)
    if (url === `/api/payment-tracker/budget?year=${year}`) return json(budget())
    if (url === '/api/payment-tracker/budget/lines' && method === 'POST') return json({ id: 'l2', budget: budget() }, 201)
    if (url.startsWith('/api/payment-tracker/budget/lines/') && method === 'PATCH') return json({ ok: true, budget: budget() })
    if (url === '/api/reminders/items' && method === 'POST') {
      const body = JSON.parse(String(init?.body))
      return json({ id: 'r1', ...body, week_days: [], snoozed_until: null, ringing: false, fired_for: null, last_fired_at: null, done: false, created_at: '', updated_at: '' }, 201)
    }
    return json({ detail: `Unexpected ${method} ${url}` }, 500)
  })
  const onClose = vi.fn()
  const changed = vi.fn()

  beforeAll(() => {
    // jsdom lacks showModal()/close(); this minimal polyfill makes dialogs open like a browser.
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.open = false
    }
  })
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    window.addEventListener(DATA_CHANGED_EVENT, changed)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.removeEventListener(DATA_CHANGED_EVENT, changed)
    fetchMock.mockClear()
    onClose.mockClear()
    changed.mockClear()
  })

  const renderDialog = () =>
    render(
      <ToastProvider>
        <QuickAddDialog onClose={onClose} />
      </ToastProvider>,
    )
  const calls = (method: string, url: string) =>
    fetchMock.mock.calls.filter(([u, init]) => (init?.method ?? 'GET') === method && String(u).startsWith(url))

  it('adds a payment with the title plan filled in', async () => {
    renderDialog()
    await waitFor(() => expect(screen.getByLabelText('Amount')).toHaveValue(500))
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-12-01')

    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const [post] = calls('POST', '/api/payment-tracker/payments')
    expect(sent(post)).toMatchObject({ title: 'Car Loan', amount: '500', status: 'Paid', due_date: '2026-12-01' })
    expect(changed).toHaveBeenCalled()
  })

  it('adds an expense on top of what this month already has', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Expense' }))
    await userEvent.type(await screen.findByLabelText(/Amount spent/), '50')
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const [patch] = calls('PATCH', '/api/payment-tracker/budget/lines/l1')
    expect(sent(patch)).toEqual({ month, value: '150', year })
  })

  it('creates a new expense item when asked', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Expense' }))
    await userEvent.selectOptions(await screen.findByLabelText('Expense'), '+ New item…')
    await userEvent.type(screen.getByLabelText('Item'), 'Taxi')
    await userEvent.type(screen.getByLabelText(/Amount spent/), '20')
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(sent(calls('POST', '/api/payment-tracker/budget/lines')[0])).toMatchObject({ section: 'Expense', group: 'Food', item: 'Taxi', year })
    expect(sent(calls('PATCH', '/api/payment-tracker/budget/lines/l2')[0])).toEqual({ month, value: '20', year })
  })

  it('sets a one-off reminder', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Reminder' }))
    await userEvent.type(screen.getByLabelText('Remind me to'), 'Pay rent')
    await userEvent.click(screen.getByRole('button', { name: 'Set reminder' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(sent(calls('POST', '/api/reminders/items')[0])).toMatchObject({ text: 'Pay rent', repeat: 'none' })
  })

  it('is view only while offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      renderDialog()
      expect(screen.getByText(/view-only/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Payment' })).not.toBeInTheDocument()
    } finally {
      vi.restoreAllMocks()
    }
  })
})