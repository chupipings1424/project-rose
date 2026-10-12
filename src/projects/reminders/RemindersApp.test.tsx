import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Reminder } from '../../../shared/reminders'
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

describe('RemindersApp', () => {
  let items: Reminder[]
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.endsWith('/items') && method === 'GET') return json(items)
    if (url.endsWith('/items') && method === 'POST') {
      const created = reminder({ id: 'r9', ...JSON.parse(String(init?.body)) })
      items = [...items, created]
      return json(created, 201)
    }
    const snooze = url.match(/\/items\/(\w+)\/snooze$/)
    if (snooze) {
      items = items.map((r) => (r.id === snooze[1] ? { ...r, ringing: false, snoozedUntil: '2030-01-01T02:00:00.000Z' } : r))
      return json(items.find((r) => r.id === snooze[1]))
    }
    return json({ error: `Unexpected ${method} ${url}` }, 500)
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
    expect(body.weekDays).toContain(5)
  })
})