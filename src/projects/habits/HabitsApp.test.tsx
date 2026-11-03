import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/toast/ToastProvider'
import { todayIso } from '../../lib/format'
import HabitsApp from './HabitsApp'

const today = todayIso()

/** What the .NET API sends (snake_case). */
const wireHabit = (overrides: Record<string, unknown> = {}) => ({
  id: 'h1',
  name: 'Read',
  icon: '',
  kind: 'check',
  target: 1,
  unit: '',
  remind_at: '21:00',
  today: 0,
  done_today: false,
  current_streak: 0,
  best_streak: 3,
  log: {},
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

describe('HabitsApp', () => {
  let putResult: () => Promise<Response>
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.endsWith('/items') && method === 'GET') return json([wireHabit()])
    if (url.endsWith('/items') && method === 'POST') {
      const sent = JSON.parse(String(init?.body))
      return json(wireHabit({ id: 'h2', ...sent }), 201)
    }
    if (url.includes('/items/h1/days/') && method === 'PUT') return putResult()
    return json({ detail: `Unexpected ${method} ${url}` }, 500)
  })

  beforeEach(() => {
    putResult = () => json(wireHabit({ today: 1, done_today: true, current_streak: 1, log: { [today]: 1 } }))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockClear()
  })

  const renderApp = () =>
    render(
      <MemoryRouter>
        <ToastProvider>
          <HabitsApp />
        </ToastProvider>
      </MemoryRouter>,
    )

  const todayButton = (card: HTMLElement) => within(card).getAllByRole('button', { name: /: (not )?done$/ }).at(-1)!

  it('ticks today optimistically and keeps it once the API agrees', async () => {
    let release: () => void = () => {}
    putResult = () =>
      new Promise((resolve) => {
        release = () => resolve(new Response(JSON.stringify(wireHabit({ today: 1, done_today: true, current_streak: 1, log: { [today]: 1 } })), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      })
    renderApp()
    const card = await screen.findByRole('article', { name: 'Read' })
    expect(todayButton(card)).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(todayButton(card))
    // Shown as done before the API has answered.
    expect(todayButton(card)).toHaveAttribute('aria-pressed', 'true')
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
    expect(String(put[0])).toContain(`/api/habits/items/h1/days/${today}`)
    expect(JSON.parse(String(put[1]!.body))).toEqual({ value: 1 })

    release()
    await screen.findByText('1-day streak')
    expect(todayButton(card)).toHaveAttribute('aria-pressed', 'true')
  })

  it('rolls the tick back when the API refuses', async () => {
    putResult = () => json({ detail: 'Only the last 7 days can be changed.' }, 400)
    renderApp()
    const card = await screen.findByRole('article', { name: 'Read' })

    await userEvent.click(todayButton(card))

    await screen.findByText('Only the last 7 days can be changed.')
    await waitFor(() => expect(todayButton(card)).toHaveAttribute('aria-pressed', 'false'))
  })

  it('creates a count habit with a nudge time', async () => {
    renderApp()
    await screen.findByRole('article', { name: 'Read' })
    await userEvent.type(screen.getByLabelText('Habit'), 'Water')
    await userEvent.click(screen.getByRole('button', { name: 'Count towards a target' }))
    await userEvent.type(screen.getByLabelText('Daily target'), '8')
    await userEvent.type(screen.getByLabelText(/Unit/), 'glasses')
    await userEvent.type(screen.getByLabelText(/Nudge me at/), '20:30')
    await userEvent.click(screen.getByRole('button', { name: 'Add habit' }))

    await screen.findByRole('article', { name: 'Water' })
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(String(post[1]!.body))).toEqual({
      name: 'Water',
      icon: '',
      kind: 'count',
      target: 8,
      unit: 'glasses',
      remind_at: '20:30',
    })
  })
})