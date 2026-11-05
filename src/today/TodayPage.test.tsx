import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/toast/ToastProvider'
import { CurrencyProvider } from '../currency/CurrencyProvider'
import { announceDataChanged } from '../lib/dataEvents'
import { dueLabel } from './api'
import TodayPage from './TodayPage'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

/** What GET /api/today sends (snake_case). */
const todayView = (habitDone = false) => ({
  date: '2026-11-05',
  budget: { year: 2026, month: 10, month_name: 'Nov', revenue: 50000, expenses: 12000, left: 38000 },
  payments: [
    { id: 'p1', title: 'Car Loan', amount: 500, due_date: '2026-11-03', days_until_due: -2 },
    { id: 'p2', title: 'Phone', amount: 80, due_date: '2026-11-08', days_until_due: 3 },
  ],
  reminders: [{ id: 'r1', text: 'Call mom', due_at: '2026-11-05T10:00:00.000Z', ringing: true, overdue: true }],
  habits: [
    { id: 'h1', name: 'Read', icon: '', kind: 'check', done: habitDone ? 1 : 0, target: 1, unit: '', done_today: habitDone },
    { id: 'h2', name: 'Water', icon: '', kind: 'count', done: 3, target: 8, unit: 'glasses', done_today: false },
  ],
})

describe('dueLabel', () => {
  it.each([
    [-1, 'Overdue 1 day'],
    [-4, 'Overdue 4 days'],
    [0, 'Due today'],
    [1, 'Tomorrow'],
    [6, 'In 6 days'],
  ])('%i -> %s', (days, label) => expect(dueLabel(days)).toBe(label))
})

describe('TodayPage', () => {
  let habitDone = false
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/today') return json(todayView(habitDone))
    if (url.startsWith('/api/habits/items/h1/days/') && method === 'PUT') {
      habitDone = true
      return json({ id: 'h1', name: 'Read', icon: '', kind: 'check', target: 1, unit: '', remind_at: null, today: 1, done_today: true, current_streak: 1, best_streak: 1, log: {}, created_at: '', updated_at: '' })
    }
    return json({ detail: `Unexpected ${method} ${url}` }, 500)
  })

  beforeEach(() => {
    habitDone = false
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockClear()
  })

  const renderPage = () =>
    render(
      <CurrencyProvider>
        <MemoryRouter>
          <ToastProvider>
            <TodayPage />
          </ToastProvider>
        </MemoryRouter>
      </CurrencyProvider>,
    )

  it('shows due payments, reminders, habits and the month budget', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument()

    const payments = screen.getByRole('region', { name: 'Payments due' })
    expect(within(payments).getByText('Overdue 2 days')).toBeInTheDocument()
    expect(within(payments).getByText('In 3 days')).toBeInTheDocument()
    expect(within(payments).getByRole('link', { name: /Car Loan/ })).toHaveAttribute(
      'href',
      '/projects/payment-tracker?title=Car%20Loan',
    )

    expect(within(screen.getByRole('region', { name: 'Reminders' })).getByText('Call mom')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Habits · 0/2' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: /Budget · Nov/ })).getByText('₱38.0K')).toBeInTheDocument()
  })

  it('ticks a habit for the day and reloads', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Read: not done' }))

    expect(await screen.findByRole('button', { name: 'Read: done' })).toHaveAttribute('aria-pressed', 'true')
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
    expect(String(put[0])).toBe('/api/habits/items/h1/days/2026-11-05')
    expect(JSON.parse(String(put[1]?.body))).toEqual({ value: 1 })
  })

  it('reloads when quick add saved something', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Today' })
    const before = fetchMock.mock.calls.filter(([url]) => url === '/api/today').length

    announceDataChanged()
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url === '/api/today').length).toBe(before + 1))
  })
})