/** The languages ROSE Lingo knows. The API has the same list at GET /api/lingo/languages. */
export type LanguageCode = 'tl' | 'en' | 'ja' | 'ko' | 'zh-Hans' | 'zh-Hant' | 'de'

export interface Language {
  code: LanguageCode
  name: string
  nativeName: string
  /** BCP 47 tag for the browser's text-to-speech. */
  speech: string
  /** Japanese, Korean and Chinese get a reading in Latin letters (romaji / romanization / pinyin). */
  hasReading: boolean
  /** The API has a built-in starter deck for it. */
  hasStarter: boolean
}

export const LANGUAGES: readonly Language[] = [
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog', speech: 'fil-PH', hasReading: false, hasStarter: true },
  { code: 'en', name: 'English', nativeName: 'English', speech: 'en-US', hasReading: false, hasStarter: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', speech: 'ja-JP', hasReading: true, hasStarter: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', speech: 'ko-KR', hasReading: true, hasStarter: true },
  { code: 'zh-Hans', name: 'Chinese (Simplified)', nativeName: '简体中文', speech: 'zh-CN', hasReading: true, hasStarter: true },
  { code: 'zh-Hant', name: 'Chinese (Traditional)', nativeName: '繁體中文', speech: 'zh-TW', hasReading: true, hasStarter: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', speech: 'de-DE', hasReading: false, hasStarter: true },
]

/** The language you study on Flashcards and Quiz until you pick another one. */
export const DEFAULT_LANGUAGE: LanguageCode = 'ko'

/** Translate always opens on Tagalog -> English. */
export const DEFAULT_FROM: LanguageCode = 'tl'
export const DEFAULT_TO: LanguageCode = 'en'

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

/** Is the offline model on this PC, and is it in memory right now? */
export interface TranslatorStatus {
  installed: boolean
  loaded: boolean
  engine: string
  message: string
}

/** meaning: see the word, pick the meaning. term: see the meaning, pick the word. listen: hear it, pick the meaning. */
export type QuizKind = 'meaning' | 'term' | 'listen'

/** random: "Take a quiz" (5 / 10 / 20 random cards). custom: "Make a quiz" from cards you pick. */
export type QuizMode = 'random' | 'custom'

export const QUIZ_SIZES = [5, 10, 20] as const

/** The API needs this many cards in a deck to have wrong answers to offer. */
export const QUIZ_MIN_CARDS = 4

export interface QuizQuestion {
  number: number
  cardId: string
  kind: QuizKind
  prompt: string
  reading: string
  choices: string[]
  answer: number
}

export interface Quiz {
  language: LanguageCode
  mode: QuizMode
  questions: QuizQuestion[]
  /** More cards needed before there can be a quiz (0 = enough). */
  cardsNeeded: number
}

export interface QuizResult {
  id: number
  day: string
  language: LanguageCode
  mode: QuizMode
  score: number
  total: number
  completedAt: string
}

export interface LingoStats {
  cards: number
  due: number
  learned: number
}

export type KanaGroup = 'basic' | 'dakuten' | 'combo'

export interface KanaEntry {
  hiragana: string
  katakana: string
  romaji: string
  group: KanaGroup
}

export type HangulGroup = 'consonant' | 'double' | 'vowel' | 'compound'

export interface HangulEntry {
  /** The letter on its own, e.g. "ㄱ". */
  letter: string
  romanization: string
  group: HangulGroup
  /** What Koreans call it, e.g. "기역 (giyeok)". Vowels are named by their sound. */
  name: string
  /** The letter in a real syllable block: 가 for ㄱ, 아 for ㅏ. */
  syllable: string
  syllableRomanization: string
}