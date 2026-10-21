/** The languages ROSE Lingo teaches. The API has the same list at GET /api/lingo/languages. */
export type LanguageCode = 'ja' | 'ko' | 'de' | 'en'

export interface Language {
  code: LanguageCode
  name: string
  nativeName: string
  /** BCP 47 tag for the browser's text-to-speech. */
  speech: string
  /** Japanese and Korean cards get a reading in Latin letters (romaji / romanization). */
  hasReading: boolean
  /** The API has a built-in starter deck for it. */
  hasStarter: boolean
}

export const LANGUAGES: readonly Language[] = [
  { code: 'ja', name: 'Japanese', nativeName: '日本語', speech: 'ja-JP', hasReading: true, hasStarter: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', speech: 'ko-KR', hasReading: true, hasStarter: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', speech: 'de-DE', hasReading: false, hasStarter: true },
  { code: 'en', name: 'English', nativeName: 'English', speech: 'en-US', hasReading: false, hasStarter: false },
]

export const DEFAULT_LANGUAGE: LanguageCode = 'ja'

export function languageOf(code: LanguageCode): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return LANGUAGES.some((l) => l.code === value)
}

export type Grade = 'again' | 'hard' | 'good' | 'easy'

export interface Card {
  id: string
  language: LanguageCode
  term: string
  reading: string
  meaning: string
  notes: string
  createdAt: string
  repetitions: number
  intervalDays: number
  ease: number
  /** yyyy-MM-dd */
  dueOn: string
  lapses: number
  lastReviewedOn: string | null
  isDue: boolean
}

export interface CardInput {
  term: string
  reading: string
  meaning: string
  notes: string
}

export interface Translation {
  text: string
  translation: string
  from: LanguageCode
  to: LanguageCode
  textReading: string
  translationReading: string
}

/** meaning: see the word, pick the meaning. term: see the meaning, pick the word. listen: hear it, pick the meaning. */
export type QuizKind = 'meaning' | 'term' | 'listen'

export interface QuizQuestion {
  number: number
  cardId: string
  kind: QuizKind
  prompt: string
  reading: string
  choices: string[]
  answer: number
}

export interface QuizResult {
  day: string
  language: LanguageCode
  score: number
  total: number
  completedAt: string
}

export interface Quiz {
  day: string
  language: LanguageCode
  questions: QuizQuestion[]
  /** More cards needed before there can be a quiz (0 = enough). */
  cardsNeeded: number
  completed: QuizResult | null
}

export interface LingoStats {
  cards: number
  due: number
  learned: number
  streak: number
  quizDoneToday: boolean
}

export type KanaGroup = 'basic' | 'dakuten' | 'combo'

export interface KanaEntry {
  hiragana: string
  katakana: string
  romaji: string
  group: KanaGroup
}
