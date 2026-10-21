import { afterEach, describe, expect, it, vi } from 'vitest'
import { lingoApi } from './client'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

describe('lingoApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('maps snake_case cards to camelCase', async () => {
    const fetchMock = vi.fn(() =>
      json([
        {
          id: 'c1',
          language: 'ko',
          term: '물',
          reading: 'mul',
          meaning: 'water',
          notes: '',
          created_at: '2026-01-01T00:00:00+00:00',
          repetitions: 2,
          interval_days: 6,
          ease: 2.5,
          due_on: '2026-01-07',
          lapses: 0,
          last_reviewed_on: '2026-01-01',
          is_due: false,
        },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const [card] = await lingoApi.cards('ko')

    expect(String(fetchMock.mock.calls[0])).toContain('/api/lingo/cards?language=ko')
    expect(card).toMatchObject({ id: 'c1', intervalDays: 6, dueOn: '2026-01-07', lastReviewedOn: '2026-01-01', isDue: false })
  })

  it('sends quiz answers in snake_case', async () => {
    const fetchMock = vi.fn((_url: RequestInfo | URL, _init?: RequestInit) =>
      json({ day: '2026-01-01', language: 'ja', score: 1, total: 2, completed_at: '2026-01-01T09:00:00+00:00' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await lingoApi.submitQuiz('ja', [
      { cardId: 'a', correct: true },
      { cardId: 'b', correct: false },
    ])

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/lingo/quiz')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      language: 'ja',
      results: [
        { card_id: 'a', correct: true },
        { card_id: 'b', correct: false },
      ],
    })
    expect(result).toEqual({ day: '2026-01-01', language: 'ja', score: 1, total: 2, completedAt: '2026-01-01T09:00:00+00:00' })
  })

  it('maps translation readings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        json({ text: 'hello', translation: 'こんにちは', from: 'en', to: 'ja', text_reading: '', translation_reading: 'konnichiha' }),
      ),
    )
    expect(await lingoApi.translate('hello', 'en', 'ja')).toMatchObject({ translationReading: 'konnichiha', textReading: '' })
  })
})
