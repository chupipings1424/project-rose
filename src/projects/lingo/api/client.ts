import { requestJson } from '../../../api/http'
import type {
  Card,
  CardInput,
  Grade,
  KanaEntry,
  LanguageCode,
  LingoStats,
  Quiz,
  QuizQuestion,
  QuizResult,
  Translation,
} from '../model'

/** The ROSE Lingo part of the API (Vite proxies /api, see vite.config.ts). */
export const LINGO_API = '/api/lingo'

// snake_case on the wire, camelCase in the page. Only these mappers know both.
interface CardDto {
  id: string
  language: LanguageCode
  term: string
  reading: string
  meaning: string
  notes: string
  created_at: string
  repetitions: number
  interval_days: number
  ease: number
  due_on: string
  lapses: number
  last_reviewed_on: string | null
  is_due: boolean
}

interface TranslationDto {
  text: string
  translation: string
  from: LanguageCode
  to: LanguageCode
  text_reading: string
  translation_reading: string
}

interface QuizQuestionDto {
  number: number
  card_id: string
  kind: QuizQuestion['kind']
  prompt: string
  reading: string
  choices: string[]
  answer: number
}

interface QuizResultDto {
  day: string
  language: LanguageCode
  score: number
  total: number
  completed_at: string
}

interface QuizDto {
  day: string
  language: LanguageCode
  questions: QuizQuestionDto[]
  cards_needed: number
  completed: QuizResultDto | null
}

interface StatsDto {
  cards: number
  due: number
  learned: number
  streak: number
  quiz_done_today: boolean
}

export const cardFromDto = (dto: CardDto): Card => ({
  id: dto.id,
  language: dto.language,
  term: dto.term,
  reading: dto.reading,
  meaning: dto.meaning,
  notes: dto.notes,
  createdAt: dto.created_at,
  repetitions: dto.repetitions,
  intervalDays: dto.interval_days,
  ease: dto.ease,
  dueOn: dto.due_on,
  lapses: dto.lapses,
  lastReviewedOn: dto.last_reviewed_on,
  isDue: dto.is_due,
})

const resultFromDto = (dto: QuizResultDto): QuizResult => ({
  day: dto.day,
  language: dto.language,
  score: dto.score,
  total: dto.total,
  completedAt: dto.completed_at,
})

const quizFromDto = (dto: QuizDto): Quiz => ({
  day: dto.day,
  language: dto.language,
  cardsNeeded: dto.cards_needed,
  completed: dto.completed ? resultFromDto(dto.completed) : null,
  questions: dto.questions.map((q) => ({
    number: q.number,
    cardId: q.card_id,
    kind: q.kind,
    prompt: q.prompt,
    reading: q.reading,
    choices: q.choices,
    answer: q.answer,
  })),
})

function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  return requestJson<T>(`${LINGO_API}${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const q = (language: LanguageCode) => `?language=${encodeURIComponent(language)}`
const id = (value: string) => encodeURIComponent(value)

/** Every ROSE Lingo endpoint, typed. Components never call fetch directly. */
export const lingoApi = {
  translate: async (text: string, from: LanguageCode, to: LanguageCode): Promise<Translation> => {
    const dto = await call<TranslationDto>('/translate', 'POST', { text, from, to })
    return {
      text: dto.text,
      translation: dto.translation,
      from: dto.from,
      to: dto.to,
      textReading: dto.text_reading,
      translationReading: dto.translation_reading,
    }
  },
  cards: async (language: LanguageCode) => (await call<CardDto[]>(`/cards${q(language)}`)).map(cardFromDto),
  due: async (language: LanguageCode) => (await call<CardDto[]>(`/cards/due${q(language)}`)).map(cardFromDto),
  createCard: async (language: LanguageCode, input: CardInput) =>
    cardFromDto(await call<CardDto>('/cards', 'POST', { language, ...input })),
  updateCard: async (cardId: string, input: CardInput) =>
    cardFromDto(await call<CardDto>(`/cards/${id(cardId)}`, 'PATCH', input)),
  deleteCard: (cardId: string) => call<{ ok: true }>(`/cards/${id(cardId)}`, 'DELETE'),
  review: async (cardId: string, grade: Grade) =>
    cardFromDto(await call<CardDto>(`/cards/${id(cardId)}/review`, 'POST', { grade })),
  importStarter: (language: LanguageCode) =>
    call<{ added: number; skipped: number }>(`/starter/${encodeURIComponent(language)}`, 'POST'),
  quiz: async (language: LanguageCode) => quizFromDto(await call<QuizDto>(`/quiz${q(language)}`)),
  submitQuiz: async (language: LanguageCode, results: { cardId: string; correct: boolean }[]) =>
    resultFromDto(
      await call<QuizResultDto>('/quiz', 'POST', {
        language,
        results: results.map((r) => ({ card_id: r.cardId, correct: r.correct })),
      }),
    ),
  stats: async (language?: LanguageCode): Promise<LingoStats> => {
    const dto = await call<StatsDto>(`/stats${language ? q(language) : ''}`)
    return { cards: dto.cards, due: dto.due, learned: dto.learned, streak: dto.streak, quizDoneToday: dto.quiz_done_today }
  },
  kana: () => call<KanaEntry[]>('/kana'),
}
