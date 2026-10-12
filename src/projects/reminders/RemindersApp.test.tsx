import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Reminder } from './model'
import { ToastProvider } from '../../components/toast/ToastProvider'
import RemindersApp from './RemindersApp'

function reminder(overrides: Partial<Reminder>): Reminder {
  return {
    id: 'r1',
    text: 'Pay the electric bill',
    dueAt: '2030-01-01T01:00:00.000Z',
    repeat: 'none',
    weekDays: [],
    done: false,
    ringing: false,
    snoozedUntil: null,
    firedFor: null,
    lastFiredAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

/** The API answers in snake_case, like the real .NET backend. */
const wire = (r: Reminder) => ({
  id: r.id,
  text: r.text,
  due_at: r.dueAt,
  repeat: r.repeat,
  week_days: r.weekDays,
  done: r.done,
  ringing: r.ringing,
  snoozed_until: r.snoozedUntil,
  fired_for: r.firedFor,
  last_fired_at: r.lastFiredAt,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
})

describe('RemindersApp', () => {
  let items: Reminder[]
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.endsWith('/items') && method === 'GET') return json(items.map(wire))
    if (url.endsWith('/items') && method === 'POST') {
      const sent = JSON.parse(String(init?.body))
      const created = reminder({ id: 'r9', text: sent.text, dueAt: sent.due_at, repeat: sent.repeat, weekDays: sent.week_days })
      items = [...items, created]
      return json(wire(created), 201)
    }
    const snooze = url.match(/\/items\/(\w+)\/snooze$/)
    if (snooze) {
      items = items.map((r) => (r.id === snooze[1] ? { ...r, ringing: false, snoozedUntil: '2030-01-01T02:00:00.000Z' } : r))
      return json(wire(items.find((r) => r.id === snooze[1])!))
    }
    return json({ detail: `Unexpected ${method} ${url}` }, 500)
  })

  beforeEach(() => {
    items = [reminder({ id: 'r1', text: 'Take vitamins', ringing: true, repeat: 'daily' }), reminder({ id: 'r2' })]
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockClear()
  })

  const renderApp = () =>
    render(
      <ToastProvider>
        <RemindersApp />
      </ToastProvider>,
    )

  it('groups reminders and snoozes a ringing one', async () => {
    renderApp()
    const ringing = await screen.findByRole('heading', { name: /Ringing now/ })
    const section = ringing.closest('section')!
    expect(within(section).getByText('Take vitamins')).toBeInTheDocument()
    expect(screen.getByText('Pay the electric bill')).toBeInTheDocument()

    await userEvent.selectOptions(within(section).getByLabelText('Snooze Take vitamins'), '10')

    await waitFor(() => expect(screen.queryByRole('heading', { name: /Ringing now/ })).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/reminders/items/r1/snooze', expect.objectContaining({ body: '{"minutes":10}' }))
    expect(screen.getByText(/Snoozed until/)).toBeInTheDocument()
  })

  it('adds a weekly reminder', async () => {
    renderApp()
    await screen.findByText('Pay the electric bill')
    await userEvent.type(screen.getByLabelText(/Remind me to/), 'Gym')
    await userEvent.selectOptions(screen.getByLabelText('Repeat'), 'weekly')
    const group = screen.getByRole('group', { name: 'Weekdays' })
    await userEvent.click(within(group).getByRole('button', { name: 'Fri' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add reminder' }))

    await screen.findByText('Gym')
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    const body = JSON.parse(String(post[1]!.body))
    expect(body).toMatchObject({ text: 'Gym', repeat: 'weekly' })
    expect(body.week_days).toContain(5)
  })
})