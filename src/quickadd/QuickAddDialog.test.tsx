import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommandDraft } from '../commands/draft'
import { ToastProvider } from '../components/toast/ToastProvider'
import { CurrencyProvider } from '../currency/CurrencyProvider'
import { DATA_CHANGED_EVENT } from '../lib/dataEvents'
import { todayIso } from '../lib/format'
import { memoryStorage, setOutboxStorage, type OutboxStorage } from '../lib/outbox'
import QuickAddDialog from './QuickAddDialog'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const month = new Date().getMonth()
const year = new Date().getFullYear()

// What the server has for Groceries this month; POST budget/expenses adds to it, like the real API.
let groceries = 100

const budget = () => {
  const amounts = Array<number>(12).fill(0)
  amounts[month] = groceries
  const line = { id: 'l1', year, section: 'Expense', group: 'Food', item: 'Groceries', amounts, total: groceries, notes: '' }
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
const header = (call: unknown[], name: string) => new Headers((call[1] as RequestInit).headers).get(name)

describe('QuickAddDialog', () => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/payment-tracker/accounts') return json([{ title: 'Car Loan' }, { title: 'Phone' }])
    if (url === '/api/payment-tracker/summary/Car%20Loan')
      return json({ title: 'Car Loan', has_plan: true, per_payment: 500, next_due_date: '2026-12-01' })
    if (url === '/api/payment-tracker/payments' && method === 'POST') return json({ id: 'p9', settled: true, summary: {} }, 201)
    if (url === `/api/payment-tracker/budget?year=${year}`) return json(budget())
    if (url === '/api/payment-tracker/budget/expenses' && method === 'POST') {
      const body = JSON.parse(String(init?.body))
      if (Number(body.amount) > 9000) return json({ detail: 'That is a lot - check the amount.' }, 400)
      const existing = body.item.toLowerCase() === 'groceries'
      if (existing) groceries += Number(body.amount)
      return json(
        { line_id: existing ? 'l1' : 'l2', item: body.item, group: body.group, year, month, month_total: existing ? groceries : Number(body.amount), created_line: !existing },
        201,
      )
    }
    if (url === '/api/reminders/items' && method === 'POST') {
      const body = JSON.parse(String(init?.body))
      return json({ id: 'r1', ...body, week_days: [], snoozed_until: null, ringing: false, fired_for: null, last_fired_at: null, done: false, created_at: '', updated_at: '' }, 201)
    }
    return json({ detail: `Unexpected ${method} ${url}` }, 500)
  })
  const onClose = vi.fn()
  const changed = vi.fn()
  let storage: OutboxStorage

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
    groceries = 100
    storage = memoryStorage()
    setOutboxStorage(storage)
    vi.stubGlobal('fetch', fetchMock)
    window.addEventListener(DATA_CHANGED_EVENT, changed)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    window.removeEventListener(DATA_CHANGED_EVENT, changed)
    fetchMock.mockClear()
    onClose.mockClear()
    changed.mockClear()
  })

  const renderDialog = (draft?: CommandDraft) =>
    render(
      <CurrencyProvider>
        <ToastProvider>
          <QuickAddDialog onClose={onClose} draft={draft} />
        </ToastProvider>
      </CurrencyProvider>,
    )
  const calls = (method: string, url: string) =>
    fetchMock.mock.calls.filter(([u, init]) => (init?.method ?? 'GET') === method && String(u).startsWith(url))
  const goOffline = () => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

  it('adds a payment with the title plan filled in, sent once-only', async () => {
    renderDialog()
    await waitFor(() => expect(screen.getByLabelText('Amount')).toHaveValue(500))
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-12-01')

    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const [post] = calls('POST', '/api/payment-tracker/payments')
    expect(sent(post)).toMatchObject({ title: 'Car Loan', amount: '500', status: 'Paid', due_date: '2026-12-01' })
    // The key lets the server ignore a repeat of the same save.
    expect(header(post, 'Idempotency-Key')).toBeTruthy()
    expect(changed).toHaveBeenCalled()
  })

  it('adds an expense to the line by name - the server adds it to the month', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Expense' }))
    await userEvent.type(await screen.findByLabelText(/Amount spent/), '50')
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const [post] = calls('POST', '/api/payment-tracker/budget/expenses')
    expect(sent(post)).toEqual({ item: 'Groceries', group: 'Food', amount: '50', date: todayIso() })
    expect(calls('PATCH', '/api/payment-tracker/budget/lines')).toHaveLength(0)
  })

  it('creates a new expense item when asked', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Expense' }))
    await userEvent.selectOptions(await screen.findByLabelText('Expense'), '+ New item…')
    await userEvent.type(screen.getByLabelText('Item'), 'Taxi')
    await userEvent.type(screen.getByLabelText(/Amount spent/), '20')
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(sent(calls('POST', '/api/payment-tracker/budget/expenses')[0])).toEqual({ item: 'Taxi', group: 'Food', amount: '20', date: todayIso() })
  })

  it('sets a one-off reminder', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Reminder' }))
    await userEvent.type(screen.getByLabelText('Remind me to'), 'Pay rent')
    await userEvent.click(screen.getByRole('button', { name: 'Set reminder' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(sent(calls('POST', '/api/reminders/items')[0])).toMatchObject({ text: 'Pay rent', repeat: 'none' })
  })

  it('"Save & add another" keeps the dialog open with the plan filled in again', async () => {
    renderDialog()
    const amount = await screen.findByLabelText('Amount')
    await waitFor(() => expect(amount).toHaveValue(500))
    await userEvent.clear(amount)
    await userEvent.type(amount, '650')

    await userEvent.click(screen.getByRole('button', { name: 'Save & add another' }))

    await waitFor(() => expect(calls('POST', '/api/payment-tracker/payments')).toHaveLength(1))
    expect(sent(calls('POST', '/api/payment-tracker/payments')[0])).toMatchObject({ amount: '650' })
    await waitFor(() => expect(screen.getByLabelText('Amount')).toHaveValue(500))
    // The next due date moved on, so the plan is fetched again.
    expect(calls('GET', '/api/payment-tracker/summary/Car%20Loan')).toHaveLength(2)
    expect(changed).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('adds expenses in a row, each with its own key', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Expense' }))
    await userEvent.type(await screen.findByLabelText(/Amount spent/), '50')
    await userEvent.click(screen.getByRole('button', { name: 'Save & add another' }))
    await waitFor(() => expect(screen.getByLabelText(/Amount spent/)).toHaveValue(null))

    await userEvent.type(screen.getByLabelText(/Amount spent/), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    const posts = calls('POST', '/api/payment-tracker/budget/expenses')
    expect(posts.map((call) => sent(call).amount)).toEqual(['50', '25'])
    expect(header(posts[0], 'Idempotency-Key')).not.toBe(header(posts[1], 'Idempotency-Key'))
    expect(groceries).toBe(175)
  })

  it('remembers the last tab and payment title', async () => {
    const first = renderDialog()
    await waitFor(() => expect(screen.getByLabelText('Amount')).toHaveValue(500))
    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Reminder' }))
    first.unmount()

    renderDialog()
    expect(screen.getByRole('button', { name: 'Reminder' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Payment' }))
    expect(await screen.findByLabelText('Title')).toHaveValue('Car Loan')
  })

  it('falls back to the first title when the remembered one is gone', async () => {
    localStorage.setItem('rose.quickadd', JSON.stringify({ kind: 'Payment', title: 'Deleted Loan' }))
    renderDialog()
    expect(await screen.findByLabelText('Title')).toHaveValue('Car Loan')
  })

  it('warns when an expense is also a payment title (it would count twice)', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Expense' }))
    await userEvent.selectOptions(await screen.findByLabelText('Expense'), '+ New item…')
    expect(screen.queryByText(/counts it twice/)).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Item'), 'car loan')

    expect(await screen.findByText(/counts it twice/)).toBeInTheDocument()
  })

  it('offline: keeps the save on this phone instead of sending it', async () => {
    goOffline()
    renderDialog()
    expect(screen.getByText(/saves wait on this phone/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Expense' }))
    await userEvent.type(await screen.findByLabelText(/Amount spent/), '75')
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(await screen.findByText(/Saved on this phone/)).toBeInTheDocument()
    expect(calls('POST', '/api/payment-tracker/budget/expenses')).toHaveLength(0)
    const [waiting] = await storage.all()
    expect(waiting).toMatchObject({ kind: 'expense', url: '/api/payment-tracker/budget/expenses', body: { item: 'Groceries', amount: '75' } })
  })

  it('keeps the save when the server cannot be reached', async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
    renderDialog({ kind: 'reminder', text: 'Call mom', dueAt: new Date(Date.now() + 3_600_000).toISOString() })
    await userEvent.click(await screen.findByRole('button', { name: 'Set reminder' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(await storage.all()).toHaveLength(1)
  })

  it('shows a refusal from the server and keeps the form open', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Expense' }))
    await userEvent.type(await screen.findByLabelText(/Amount spent/), '9999')
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    expect(await screen.findByText('That is a lot - check the amount.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(await storage.all()).toHaveLength(0)
  })

  it('opens filled in from a command bar draft', async () => {
    renderDialog({ kind: 'expense', item: 'groceries', amount: 80, date: todayIso() })
    expect(screen.getByRole('button', { name: 'Expense' })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByLabelText('Expense')).toHaveValue('l1')
    expect(screen.getByLabelText(/Amount spent/)).toHaveValue(80)
  })

  it('a draft for a new item starts on "+ New item"', async () => {
    renderDialog({ kind: 'expense', item: 'Taho', amount: 30, date: todayIso() })
    expect(await screen.findByLabelText('Item')).toHaveValue('Taho')
    expect(screen.getByLabelText('Expense')).toHaveValue('__new')
  })
})