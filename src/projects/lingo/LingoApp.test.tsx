import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/toast/ToastProvider'
import LingoApp, { LANGUAGE_KEY } from './LingoApp'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

/** A card as the .NET API sends it (snake_case). */
const wireCard = (id: string, term: string, meaning: string, reading = '') => ({
  id,
  language: 'ja',
  term,
  reading,
  meaning,
  notes: '',
  created_at: '2026-01-01T00:00:00+00:00',
  repetitions: 0,
  interval_days: 0,
  ease: 2.5,
  due_on: '2026-01-01',
  lapses: 0,
  last_reviewed_on: null,
  is_due: true,
})

function renderAt(path: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/projects/lingo/*" element={<LingoApp />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

type Handler = (url: string, init?: RequestInit) => Promise<Response> | undefined

function stubApi(handler: Handler) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    return handler(url, init) ?? json({ detail: `unexpected ${init?.method ?? 'GET'} ${url}` }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('LingoApp', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('reviews due cards: reveal, grade, "Again" comes back, then done', async () => {
    const graded: string[] = []
    stubApi((url, init) => {
      if (url.includes('/cards/due')) return json([wireCard('c1', '水', 'water', 'mizu'), wireCard('c2', '火', 'fire', 'hi')])
      const review = url.match(/\/cards\/(\w+)\/review$/)
      if (review) {
        graded.push(`${review[1]}:${JSON.parse(String(init?.body)).grade}`)
        return json(wireCard(review[1], review[1] === 'c1' ? '水' : '火', 'x'))
      }
      return undefined
    })
    const user = userEvent.setup()
    renderAt('/projects/lingo/review')

    expect(await screen.findByText('水')).toBeInTheDocument()
    expect(screen.queryByText('water')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show answer/i }))
    expect(screen.getByText('water')).toBeInTheDocument()
    expect(screen.getByText('mizu')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /again/i }))

    expect(await screen.findByText('火')).toBeInTheDocument()
    await user.keyboard(' ')
    await user.keyboard('3')

    // "Again" put 水 at the back of the queue
    expect(await screen.findByText('水')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    await user.click(screen.getByRole('button', { name: /good/i }))

    expect(await screen.findByText('Session complete')).toBeInTheDocument()
    expect(graded).toEqual(['c1:again', 'c2:good', 'c1:good'])
  })

  it('runs the daily quiz and shows the score and streak', async () => {
    let submitted: unknown = null
    stubApi((url, init) => {
      if (url.includes('/quiz') && (init?.method ?? 'GET') === 'GET') {
        const completed = submitted
          ? { day: '2026-01-02', language: 'ja', score: 1, total: 2, completed_at: '2026-01-02T09:00:00+00:00' }
          : null
        return json({
          day: '2026-01-02',
          language: 'ja',
          cards_needed: 0,
          completed,
          questions: completed
            ? []
            : [
                { number: 1, card_id: 'c1', kind: 'meaning', prompt: '水', reading: 'mizu', choices: ['fire', 'water', 'tree', 'sky'], answer: 1 },
                { number: 2, card_id: 'c2', kind: 'term', prompt: 'fire', reading: '', choices: ['水', '木', '火', '空'], answer: 2 },
              ],
        })
      }
      if (url.endsWith('/quiz') && init?.method === 'POST') {
        submitted = JSON.parse(String(init.body))
        return json({ day: '2026-01-02', language: 'ja', score: 1, total: 2, completed_at: '2026-01-02T09:00:00+00:00' })
      }
      if (url.includes('/stats')) return json({ cards: 10, due: 1, learned: 3, streak: 4, quiz_done_today: true })
      return undefined
    })
    const user = userEvent.setup()
    renderAt('/projects/lingo/quiz')

    expect(await screen.findByText('What does this mean?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'water' }))
    expect(screen.getByText('✓ Correct')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Which word means this?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '木' }))
    expect(screen.getByText('✗ Not quite')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(await screen.findByText('1 / 2')).toBeInTheDocument()
    expect(await screen.findByText(/4-day streak/)).toBeInTheDocument()
    expect(submitted).toEqual({
      language: 'ja',
      results: [
        { card_id: 'c1', correct: true },
        { card_id: 'c2', correct: false },
      ],
    })
  })

  it('remembers the language and only shows Kana for Japanese', async () => {
    stubApi((url) => (url.includes('/cards?language=') ? json([]) : undefined))
    const user = userEvent.setup()
    renderAt('/projects/lingo/cards')

    expect(screen.getByRole('link', { name: 'Kana' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/learning/i), 'de')

    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('de')
    expect(screen.queryByRole('link', { name: 'Kana' })).not.toBeInTheDocument()
    expect(await screen.findByText('New German card')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('No cards yet')).toBeInTheDocument())
  })
})
