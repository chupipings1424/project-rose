import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/toast/ToastProvider'
import { CurrencyProvider } from '../currency/CurrencyProvider'
import { todayIso } from '../lib/format'
import { memoryStorage, setOutboxStorage } from '../lib/outbox'
import CommandBar from './CommandBar'
import type { CommandDraft } from './draft'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

const year = new Date().getFullYear()
const budget = {
  year,
  months: [],
  sections: [
    {
      name: 'Expense',
      groups: [{ name: 'Food', lines: [{ id: 'l1', item: 'Kape', group: 'Food', amounts: [], total: 0 }] }],
    },
  ],
  known_groups: { Revenue: [], Expense: ['Food'] },
}

const sent = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body))

/** A stand-in for the browser's speech recognition, driven by the test. */
class FakeRecognition {
  static last: FakeRecognition | null = null
  lang = ''
  interimResults = true
  maxAlternatives = 5
  continuous = true
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn(() => this.onend?.())
  abort = vi.fn()
  constructor() {
    FakeRecognition.last = this
  }
  say(transcript: string) {
    this.onresult?.({ results: [[{ transcript }]] })
    this.onend?.()
  }
  fail(error: string) {
    this.onerror?.({ error })
    this.onend?.()
  }
}

describe('CommandBar', () => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/payment-tracker/accounts') return json([{ title: 'Car Loan' }])
    if (url === `/api/payment-tracker/budget?year=${year}`) return json(budget)
    if (url === '/api/payment-tracker/summary/Car%20Loan')
      return json({ title: 'Car Loan', has_plan: true, per_payment: 500, next_due_date: '2026-12-01' })
    if (method === 'POST') return json({ ok: true, line_id: 'l1', id: 'x' }, 201)
    return json({ detail: `Unexpected ${method} ${url}` }, 500)
  })
  const onEdit = vi.fn()

  beforeEach(() => {
    setOutboxStorage(memoryStorage())
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockClear()
    onEdit.mockClear()
    FakeRecognition.last = null
  })

  const renderBar = () =>
    render(
      <CurrencyProvider>
        <ToastProvider>
          <CommandBar onEdit={onEdit} />
        </ToastProvider>
      </CurrencyProvider>,
    )
  const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
  const preview = async (text: string) => {
    await userEvent.type(screen.getByLabelText('Command'), text)
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
  }

  it('previews an expense first and saves it only after Save', async () => {
    renderBar()
    await preview('kape 50')

    const card = await screen.findByRole('group', { name: 'Preview' })
    expect(card).toHaveTextContent('Expense')
    expect(card).toHaveTextContent('Kape · ₱50.00')
    expect(posts()).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(String(posts()[0][0])).toBe('/api/payment-tracker/budget/expenses')
    expect(sent(posts()[0])).toEqual({ item: 'Kape', group: 'Food', amount: '50', date: todayIso() })
    expect(await screen.findByText('Expense saved')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Preview' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Command')).toHaveValue('')
  })

  it("pays a title with its plan's amount and due date", async () => {
    renderBar()
    await preview('bayad car loan')

    expect(await screen.findByRole('group', { name: 'Preview' })).toHaveTextContent('Car Loan · ₱500.00')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(sent(posts()[0])).toMatchObject({ title: 'Car Loan', amount: '500', status: 'Paid', due_date: '2026-12-01' })
  })

  it('sets a reminder', async () => {
    renderBar()
    await preview('remind me to pay rent bukas 5pm')

    expect(await screen.findByRole('group', { name: 'Preview' })).toHaveTextContent('Pay rent')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(posts()).toHaveLength(1))
    const due = new Date()
    due.setDate(due.getDate() + 1)
    due.setHours(17, 0, 0, 0)
    expect(sent(posts()[0])).toMatchObject({ text: 'Pay rent', due_at: due.toISOString(), repeat: 'none' })
  })

  it('Edit hands the draft to quick add instead of saving', async () => {
    renderBar()
    await preview('bayad car loan')
    await screen.findByRole('group', { name: 'Preview' })

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(onEdit).toHaveBeenCalledWith<[CommandDraft]>({ kind: 'payment', title: 'Car Loan', amount: 500, date: todayIso() })
    expect(posts()).toHaveLength(0)
  })

  it('explains what is missing', async () => {
    renderBar()
    await preview('kape')
    expect(await screen.findByText(/Magkano/)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Preview' })).not.toBeInTheDocument()
  })

  it('hides the mic when the browser cannot listen', () => {
    renderBar()
    expect(screen.queryByRole('button', { name: 'Speak a command' })).not.toBeInTheDocument()
  })

  describe('with voice', () => {
    beforeEach(() => {
      vi.stubGlobal('webkitSpeechRecognition', FakeRecognition)
    })

    it('turns what you say into a preview', async () => {
      renderBar()
      await userEvent.click(screen.getByRole('button', { name: 'Speak a command' }))
      const mic = FakeRecognition.last!
      expect(mic.start).toHaveBeenCalled()
      expect(mic.lang).toBe('en-PH')

      act(() => mic.say('kape singkwenta'))

      expect(await screen.findByRole('group', { name: 'Preview' })).toHaveTextContent('Kape · ₱50.00')
      expect(screen.getByLabelText('Command')).toHaveValue('kape singkwenta')
      expect(posts()).toHaveLength(0)
    })

    it('suggests the keyboard mic when the mic is blocked', async () => {
      renderBar()
      await userEvent.click(screen.getByRole('button', { name: 'Speak a command' }))
      act(() => FakeRecognition.last!.fail('not-allowed'))
      expect(await screen.findByText(/mic on your keyboard/)).toBeInTheDocument()
    })

    it('is hidden offline (speech needs the internet)', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      try {
        renderBar()
        expect(screen.queryByRole('button', { name: 'Speak a command' })).not.toBeInTheDocument()
      } finally {
        vi.restoreAllMocks()
      }
    })
  })
})