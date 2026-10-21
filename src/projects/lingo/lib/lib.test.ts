import { describe, expect, it } from 'vitest'
import type { Translation } from '../model'
import { daysBetween, dueLabel, localDay } from './dates'
import { drillQuestion, shuffle, type DrillItem } from './drill'
import { pickVoice } from './speech'
import { cardFromTranslation } from './translation'

const item = (symbol: string, answer: string): DrillItem => ({ symbol, answer, say: symbol })

const KANA: DrillItem[] = [item('あ', 'a'), item('い', 'i'), item('う', 'u'), item('え', 'e'), item('お', 'o'), item('じ', 'ji'), item('ぢ', 'ji')]
const HANGUL: DrillItem[] = [
  { symbol: 'ㄱ', answer: 'g / k', say: '가' },
  { symbol: 'ㄴ', answer: 'n', say: '나' },
  { symbol: 'ㅏ', answer: 'a', say: '아' },
  { symbol: 'ㅓ', answer: 'eo', say: '어' },
]

/** A repeatable "random" sequence for tests. */
function seeded(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

describe('dates', () => {
  it('formats the local day as yyyy-MM-dd', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('counts whole days, including across a month end', () => {
    expect(daysBetween('2026-01-31', '2026-02-02')).toBe(2)
    expect(daysBetween('2026-03-10', '2026-03-08')).toBe(-2)
  })

  it('labels when a card is due', () => {
    expect(dueLabel('2026-01-01', '2026-01-03')).toBe('Due now')
    expect(dueLabel('2026-01-03', '2026-01-03')).toBe('Due now')
    expect(dueLabel('2026-01-04', '2026-01-03')).toBe('Tomorrow')
    expect(dueLabel('2026-01-09', '2026-01-03')).toBe('In 6 days')
  })
})

describe('drill', () => {
  it('shuffles without losing or changing items', () => {
    const items = [1, 2, 3, 4, 5]
    const shuffled = shuffle(items, seeded([0.1, 0.7, 0.4, 0.9]))
    expect([...shuffled].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5])
  })

  it('asks a symbol with four distinct choices including the answer', () => {
    for (let i = 0; i < 25; i++) {
      const question = drillQuestion(KANA)
      expect(question.choices).toHaveLength(4)
      expect(new Set(question.choices).size).toBe(4)
      expect(question.choices).toContain(question.answer)
      expect(KANA.find((k) => k.symbol === question.symbol)?.answer).toBe(question.answer)
    }
  })

  it('never offers the twin kana (じ / ぢ) as a second "ji"', () => {
    const question = drillQuestion(KANA, seeded([0.9, 0]))
    expect(question.choices.filter((c) => c === 'ji').length).toBeLessThanOrEqual(1)
  })

  it('does not repeat the previous symbol', () => {
    for (let i = 0; i < 25; i++) expect(drillQuestion(KANA, Math.random, 'あ').symbol).not.toBe('あ')
  })

  it('keeps what to say aloud: a Hangul letter is read as its syllable', () => {
    const question = drillQuestion(HANGUL, seeded([0]))
    expect(question).toMatchObject({ symbol: 'ㄱ', answer: 'g / k', say: '가' })
  })
})

describe('pickVoice', () => {
  const voice = (lang: string) => ({ lang, name: lang }) as SpeechSynthesisVoice
  const voices = [voice('en-US'), voice('zh-CN'), voice('zh_TW'), voice('ko-KR')]

  it('prefers the exact region', () => {
    expect(pickVoice(voices, 'zh-TW')?.name).toBe('zh_TW')
    expect(pickVoice(voices, 'zh-CN')?.name).toBe('zh-CN')
  })

  it('falls back to the same language, else nothing', () => {
    expect(pickVoice(voices, 'en-GB')?.name).toBe('en-US')
    expect(pickVoice(voices, 'fil-PH')).toBeUndefined()
  })
})

describe('cardFromTranslation', () => {
  const result: Translation = {
    text: 'water',
    translation: 'みず',
    from: 'en',
    to: 'ja',
    textReading: '',
    translationReading: 'mizu',
  }

  it('uses the learning-language side as the term', () => {
    expect(cardFromTranslation(result, 'ja')).toEqual({
      language: 'ja',
      input: { term: 'みず', reading: 'mizu', meaning: 'water', notes: '' },
    })
  })

  it('works when translating out of the learning language', () => {
    const reverse: Translation = { ...result, text: 'みず', translation: 'water', from: 'ja', to: 'en', textReading: 'mizu', translationReading: '' }
    expect(cardFromTranslation(reverse, 'ja')).toEqual({
      language: 'ja',
      input: { term: 'みず', reading: 'mizu', meaning: 'water', notes: '' },
    })
  })

  it('otherwise saves the foreign (non-English) side to its own deck', () => {
    const tagalog: Translation = { text: 'tubig', translation: 'water', from: 'tl', to: 'en', textReading: '', translationReading: '' }
    expect(cardFromTranslation(tagalog, 'ko')).toEqual({
      language: 'tl',
      input: { term: 'tubig', reading: '', meaning: 'water', notes: '' },
    })
    expect(cardFromTranslation(result, 'de').language).toBe('ja')
  })

  it('between two non-English languages, uses the one translated into', () => {
    const toKorean: Translation = { text: 'tubig', translation: '물', from: 'tl', to: 'ko', textReading: '', translationReading: 'mul' }
    expect(cardFromTranslation(toKorean, 'de')).toEqual({
      language: 'ko',
      input: { term: '물', reading: 'mul', meaning: 'tubig', notes: '' },
    })
  })
})