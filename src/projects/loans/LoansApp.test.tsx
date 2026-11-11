import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/toast/ToastProvider'
import { CurrencyProvider } from '../../currency/CurrencyProvider'
import LoansApp from './LoansApp'

/** What the .NET API sends (snake_case): a 3-month loan with one payment made. */
const wireLoan = (overrides: Record<string, unknown> = {}) => ({
  id: 'l1',
  name: 'Coop loan',
  type: 'Coop',
  loan_date: '2026-09-02',
  term: 3,
  monthly_amortization: 500,
  amount: 1400,
  total_payable: 1500,
  interest: 100,
  payments_made: 1,
  payments_left: 2,
  paid: 500,
  balance: 1000,
  percent: 33.3,
  last_payment_date: '2026-10-02',
  next_due_date: '2026-11-02',
  finish_date: '2026-12-02',
  status: 'active',
  schedule: [
    { number: 1, due_date: '2026-10-02', amount: 500, balance_after: 1000, paid: true },
    { number: 2, due_date: '2026-11-02', amount: 500, balance_after: 500, paid: false },
    { number: 3, due_date: '2026-12-02', amount: 500, balance_after: 0, paid: false },
  ],
  created_at: '2026-09-02T00:00:00.000Z',
  updated_at: '2026-09-02T00:00:00.000Z',
  ...overrides,
})

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

describe('LoansApp', () => {
  let loans: ReturnType<typeof wireLoan>[]
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.endsWith('/api/loans') && method === 'GET') return json(loans)
    if (url.endsWith('/api/loans') && method === 'POST') {
      const sent = JSON.parse(String(init?.body))
      const created = wireLoan({ id: 'l2', ...sent, status: 'not-started', payments_made: 0, paid: 0 })
      loans = [...loans, created]
      return json(created, 201)
    }
    if (url.endsWith('/api/loans/l1') && method === 'DELETE') {
      loans = []
      return json({ ok: true })
    }
    return json({ detail: `Unexpected ${method} ${url}` }, 500)
  })

  beforeEach(() => {
    // jsdom lacks showModal()/close(); this minimal polyfill makes dialogs open like a browser.
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.open = false
    }
    loans = [wireLoan(), wireLoan({ id: 'l3', name: 'Old SSS loan', type: 'SSS', status: 'completed', balance: 0 })]
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockClear()
  })

  const renderApp = (path = '/projects/loans') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <CurrencyProvider>
          <ToastProvider>
            <Routes>
              <Route path="/projects/loans/*" element={<LoansApp />} />
            </Routes>
          </ToastProvider>
        </CurrencyProvider>
      </MemoryRouter>,
    )

  it('shows each loan with its progress and puts finished loans under Completed', async () => {
    renderApp()
    const card = await screen.findByRole('article', { name: 'Coop loan' })
    expect(within(card).getByText('1 of 3 paid')).toBeInTheDocument()
    expect(within(card).getByText('Next due')).toBeInTheDocument()
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33.3')
    expect(screen.getByRole('heading', { name: 'Completed (1)' })).toBeInTheDocument()
    expect(screen.getByText('Balance')).toBeInTheDocument()
  })

  it('opens the schedule with paid and upcoming months', async () => {
    renderApp()
    const card = await screen.findByRole('article', { name: 'Coop loan' })
    await userEvent.click(within(card).getByRole('button', { name: 'Schedule' }))
    const table = await screen.findByRole('table', { name: 'Coop loan schedule' })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(4)
    expect(within(rows[1]).getByText('Paid')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Next')).toBeInTheDocument()
    expect(within(rows[3]).getByText('Upcoming')).toBeInTheDocument()
  })

  it('adds a loan in the API format', async () => {
    renderApp()
    await screen.findByRole('article', { name: 'Coop loan' })
    await userEvent.type(screen.getByLabelText('Loan name'), 'Pag-IBIG MPL')
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'Pag-IBIG')
    await userEvent.type(screen.getByLabelText('Loan date'), '2024-04-02')
    await userEvent.type(screen.getByLabelText('Term (months)'), '24')
    await userEvent.type(screen.getByLabelText('Monthly amortization'), '500')
    await userEvent.type(screen.getByLabelText('Loan amount'), '10000')
    expect(screen.getByText(/paid every 2nd of the month/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add loan' }))

    await screen.findByRole('article', { name: 'Pag-IBIG MPL' })
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(String(post[1]!.body))).toEqual({
      name: 'Pag-IBIG MPL',
      type: 'Pag-IBIG',
      loan_date: '2024-04-02',
      term: 24,
      monthly_amortization: 500,
      amount: 10000,
    })
  })

  it('warns before deleting a loan', async () => {
    renderApp()
    const card = await screen.findByRole('article', { name: 'Coop loan' })
    await userEvent.click(within(card).getByRole('button', { name: 'Delete Coop loan' }))
    const dialog = await screen.findByRole('dialog')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, delete it' }))

    await waitFor(() => expect(screen.queryByRole('article', { name: 'Coop loan' })).not.toBeInTheDocument())
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/api/loans/l1') && init?.method === 'DELETE')).toBe(true)
  })

  it('prints the report as a PDF', async () => {
    const print = vi.fn()
    vi.stubGlobal('print', print)
    renderApp('/projects/loans/report')
    await screen.findByRole('table', { name: 'Coop loan schedule' })
    expect(screen.getByRole('table', { name: 'Old SSS loan schedule' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
    expect(print).toHaveBeenCalledOnce()
  })
})
