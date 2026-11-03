import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/toast/ToastProvider'
import { CurrencyProvider } from '../../currency/CurrencyProvider'
import SavingsApp from './SavingsApp'

/** What the .NET API sends (snake_case). */
const wireGoal = (overrides: Record<string, unknown> = {}) => ({
  id: 'g1',
  name: 'New laptop',
  icon: '',
  target: 50000,
  deadline: '2030-06-30',
  saved: 5000,
  remaining: 45000,
  percent: 10,
  monthly_needed: 1500,
  estimated_finish: '2030-01-15',
  status: 'on-track',
  entries: [{ id: 'e1', date: '2026-10-01', amount: 5000, note: 'Salary' }],
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

describe('SavingsApp', () => {
  let goals: ReturnType<typeof wireGoal>[]
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.endsWith('/goals') && method === 'GET') return json(goals)
    if (url.endsWith('/goals') && method === 'POST') {
      const sent = JSON.parse(String(init?.body))
      const created = wireGoal({ id: 'g2', ...sent, saved: 0, remaining: sent.target, percent: 0, entries: [], status: 'no-deadline', monthly_needed: null, estimated_finish: null })
      goals = [...goals, created]
      return json(created, 201)
    }
    if (url.endsWith('/goals/g1/entries') && method === 'POST') {
      const sent = JSON.parse(String(init?.body))
      const updated = wireGoal({ saved: 5000 + sent.amount, percent: 20, entries: [{ id: 'e2', date: sent.date, amount: sent.amount, note: sent.note }] })
      goals = [updated]
      return json(updated, 201)
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
    goals = [wireGoal()]
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockClear()
  })

  const renderApp = () =>
    render(
      <CurrencyProvider>
        <ToastProvider>
          <SavingsApp />
        </ToastProvider>
      </CurrencyProvider>,
    )

  it('shows goals with their plan and totals', async () => {
    renderApp()
    const card = await screen.findByRole('article', { name: 'New laptop' })
    expect(within(card).getByText('On track')).toBeInTheDocument()
    expect(within(card).getByText(/a month to make the deadline/)).toBeInTheDocument()
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10')
    expect(screen.getByText('Total saved')).toBeInTheDocument()
  })

  it('creates a goal', async () => {
    renderApp()
    await screen.findByRole('article', { name: 'New laptop' })
    await userEvent.type(screen.getByLabelText('Saving for'), 'Japan trip')
    await userEvent.type(screen.getByLabelText('Target amount'), '80000')
    await userEvent.click(screen.getByRole('button', { name: 'Create goal' }))

    await screen.findByRole('article', { name: 'Japan trip' })
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(String(post[1]!.body))).toEqual({ name: 'Japan trip', icon: '', target: 80000, deadline: null })
  })

  it('adds a deposit and updates the card without reloading', async () => {
    renderApp()
    const card = await screen.findByRole('article', { name: 'New laptop' })
    await userEvent.click(within(card).getByRole('button', { name: '+ Add money' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Amount'), '5000')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add deposit' }))

    await waitFor(() => expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20'))
    expect(fetchMock).toHaveBeenCalledTimes(2) // one GET, one POST - no reload
  })
})