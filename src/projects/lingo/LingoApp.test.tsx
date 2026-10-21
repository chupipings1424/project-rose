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
    renderAt('/projects/lingo/cards/review')

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

  it('takes a random quiz, saves the score and lists it in the history', async () => {
    let submitted: unknown = null
    const deck = [wireCard('c1', '水', 'water'), wireCard('c2', '火', 'fire'), wireCard('c3', '木', 'tree'), wireCard('c4', '空', 'sky')]
    const saved = { id: 1, day: '2026-01-02', language: 'ja', mode: 'random', score: 1, total: 2, completed_at: '2026-01-02T09:00:00+00:00' }
    stubApi((url, init) => {
      if (url.includes('/cards?language=')) return json(deck)
      if (url.includes('/quiz/results?language=')) return json(submitted ? [saved] : [])
      if (url.endsWith('/quiz/results') && init?.method === 'POST') {
        submitted = JSON.parse(String(init.body))
        return json(saved)
      }
      if (url.endsWith('/quiz') && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({ language: 'ja', count: 10 })
        return json({
          language: 'ja',
          mode: 'random',
          cards_needed: 0,
          questions: [
            { number: 1, card_id: 'c1', kind: 'meaning', prompt: '水', reading: 'mizu', choices: ['fire', 'water', 'tree', 'sky'], answer: 1 },
            { number: 2, card_id: 'c2', kind: 'term', prompt: 'fire', reading: '', choices: ['水', '木', '火', '空'], answer: 2 },
          ],
        })
      }
      return undefined
    })
    localStorage.setItem(LANGUAGE_KEY, 'ja')
    const user = userEvent.setup()
    renderAt('/projects/lingo/quiz')

    await user.click(await screen.findByRole('button', { name: '10 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(await screen.findByText('What does this mean?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'water' }))
    expect(screen.getByText('✓ Correct')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Which word means this?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '木' }))
    expect(screen.getByText('✗ Not quite')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(await screen.findByText('1 / 2')).toBeInTheDocument()
    expect(submitted).toEqual({
      language: 'ja',
      mode: 'random',
      results: [
        { card_id: 'c1', correct: true },
        { card_id: 'c2', correct: false },
      ],
    })

    await user.click(screen.getByRole('button', { name: 'New quiz' }))
    expect(await screen.findByText('Recent quizzes')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('makes a quiz from the picked cards', async () => {
    let body: unknown = null
    const deck = [wireCard('c1', '水', 'water'), wireCard('c2', '火', 'fire'), wireCard('c3', '木', 'tree'), wireCard('c4', '空', 'sky')]
    stubApi((url, init) => {
      if (url.includes('/cards?language=')) return json(deck)
      if (url.includes('/quiz/results?language=')) return json([])
      if (url.endsWith('/quiz') && init?.method === 'POST') {
        body = JSON.parse(String(init.body))
        return json({
          language: 'ja',
          mode: 'custom',
          cards_needed: 0,
          questions: [{ number: 1, card_id: 'c3', kind: 'meaning', prompt: '木', reading: 'ki', choices: ['tree', 'fire', 'water', 'sky'], answer: 0 }],
        })
      }
      return undefined
    })
    localStorage.setItem(LANGUAGE_KEY, 'ja')
    const user = userEvent.setup()
    renderAt('/projects/lingo/quiz')

    const start = await screen.findByRole('button', { name: 'Start with 0 cards' })
    expect(start).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /木/ }))
    await user.click(screen.getByRole('checkbox', { name: /空/ }))
    await user.click(screen.getByRole('button', { name: 'Start with 2 cards' }))

    expect(await screen.findByText('What does this mean?')).toBeInTheDocument()
    expect(body).toEqual({ language: 'ja', card_ids: ['c3', 'c4'] })
  })

  it('asks for more cards before a quiz', async () => {
    stubApi((url) => {
      if (url.includes('/cards?language=')) return json([wireCard('c1', '水', 'water')])
      if (url.includes('/quiz/results?language=')) return json([])
      return undefined
    })
    renderAt('/projects/lingo/quiz')
    expect(await screen.findByText('Not enough cards yet')).toBeInTheDocument()
    expect(screen.getByText(/add 3 more/)).toBeInTheDocument()
  })

  it('translates Tagalog to English by default and saves the Tagalog word as a card', async () => {
    let translated: unknown = null
    let created: unknown = null
    stubApi((url, init) => {
      if (url.endsWith('/translator')) return json({ installed: true, loaded: false, engine: 'NLLB-200 distilled 600M (offline)', message: '' })
      if (url.endsWith('/translate')) {
        translated = JSON.parse(String(init?.body))
        return json({ text: 'Salamat po', translation: 'Thank you', from: 'tl', to: 'en', text_reading: '', translation_reading: '' })
      }
      if (url.endsWith('/cards') && init?.method === 'POST') {
        created = JSON.parse(String(init.body))
        return json(wireCard('n1', 'Salamat po', 'Thank you'), 201)
      }
      return undefined
    })
    const user = userEvent.setup()
    renderAt('/projects/lingo')

    expect(screen.getByLabelText('From')).toHaveValue('tl')
    expect(screen.getByLabelText('To')).toHaveValue('en')
    expect(screen.queryByLabelText(/learning/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/first translation takes a few seconds/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Text'), 'Salamat po')
    await user.click(screen.getByRole('button', { name: 'Translate' }))
    expect(await screen.findByText('Thank you')).toBeInTheDocument()
    expect(translated).toEqual({ text: 'Salamat po', from: 'tl', to: 'en' })

    await user.click(screen.getByRole('button', { name: /save as tagalog card/i }))
    expect(await screen.findByRole('button', { name: '✓ Saved' })).toBeInTheDocument()
    expect(created).toEqual({ language: 'tl', term: 'Salamat po', reading: '', meaning: 'Thank you', notes: '' })
  })

  it('explains how to install the translator when the model is missing', async () => {
    const message = 'The offline translator is not installed yet. Run setup-lingo.cmd once (it needs internet), then restart ROSE.'
    stubApi((url) => {
      if (url.endsWith('/translator')) return json({ installed: false, loaded: false, engine: 'NLLB', message })
      if (url.endsWith('/translate')) return json({ title: 'Unavailable', status: 503, detail: message }, 503)
      return undefined
    })
    const user = userEvent.setup()
    renderAt('/projects/lingo')

    expect(await screen.findByText('Install the offline translator')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Text'), 'kumusta')
    await user.click(screen.getByRole('button', { name: 'Translate' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('setup-lingo.cmd')
  })

  it('remembers the learning language and shows it only on Flashcards and Quiz', async () => {
    stubApi((url) => (url.includes('/cards?language=') ? json([]) : undefined))
    const user = userEvent.setup()
    renderAt('/projects/lingo/cards')

    expect(screen.getByRole('link', { name: 'Alphabet' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/learning/i), 'zh-Hant')

    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('zh-Hant')
    expect(await screen.findByText('New Chinese (Traditional) card')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('No cards yet')).toBeInTheDocument())
  })

  it('drills Hangul letters on the Alphabet tab', async () => {
    stubApi((url) => {
      if (url.endsWith('/kana')) return json([{ hiragana: 'あ', katakana: 'ア', romaji: 'a', group: 'basic' }])
      if (url.endsWith('/hangul'))
        return json([
          { letter: 'ㄱ', romanization: 'g / k', group: 'consonant', name: '기역 (giyeok)', syllable: '가', syllable_romanization: 'ga' },
          { letter: 'ㄴ', romanization: 'n', group: 'consonant', name: '니은 (nieun)', syllable: '나', syllable_romanization: 'na' },
          { letter: 'ㅏ', romanization: 'a', group: 'vowel', name: 'a', syllable: '아', syllable_romanization: 'a' },
          { letter: 'ㅓ', romanization: 'eo', group: 'vowel', name: 'eo', syllable: '어', syllable_romanization: 'eo' },
          { letter: 'ㄲ', romanization: 'kk', group: 'double', name: '쌍기역 (ssanggiyeok)', syllable: '까', syllable_romanization: 'kka' },
        ])
      return undefined
    })
    const user = userEvent.setup()
    renderAt('/projects/lingo/kana') // the old address still works

    await user.click(await screen.findByRole('button', { name: 'Hangul 한' }))
    expect(await screen.findByText('Double consonants (tense)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ㄱ g / k' })).toHaveAttribute('title', '기역 (giyeok)')
    // Basic level: four letters, so four distinct choices without the double consonant.
    const choices = ['g / k', 'n', 'a', 'eo'].map((c) => screen.getByRole('button', { name: c }))
    expect(choices).toHaveLength(4)
    expect(screen.queryByRole('button', { name: 'kk' })).not.toBeInTheDocument()
  })
})
