import { describe, expect, it } from 'vitest'
import type { KanaEntry, Translation } from '../model'
import { daysBetween, dueLabel, localDay } from './dates'
import { drillPool, drillQuestion, shuffle } from './kanaDrill'
import { cardFromTranslation } from './translation'

const kana = (hiragana: string, katakana: string, romaji: string, group: KanaEntry['group'] = 'basic'): KanaEntry => ({
  hiragana,
  katakana,
  romaji,
  group,
})

const CHART: KanaEntry[] = [
  kana('あ', 'ア', 'a'),
  kana('い', 'イ', 'i'),
  kana('う', 'ウ', 'u'),
  kana('え', 'エ', 'e'),
  kana('お', 'オ', 'o'),
  kana('じ', 'ジ', 'ji', 'dakuten'),
  kana('ぢ', 'ヂ', 'ji', 'dakuten'),
  kana('きゃ', 'キャ', 'kya', 'combo'),
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

describe('kanaDrill', () => {
  it('shuffles without losing or changing items', () => {
    const items = [1, 2, 3, 4, 5]
    const shuffled = shuffle(items, seeded([0.1, 0.7, 0.4, 0.9]))
    expect([...shuffled].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5])
  })

  it('builds the pool from the chosen groups', () => {
    expect(drillPool(CHART, ['basic'])).toHaveLength(5)
    expect(drillPool(CHART, ['basic', 'dakuten', 'combo'])).toHaveLength(8)
  })

  it('asks a kana with four distinct romaji choices including the answer', () => {
    for (let i = 0; i < 25; i++) {
      const question = drillQuestion(drillPool(CHART, ['basic', 'dakuten']), 'katakana')
      expect(question.choices).toHaveLength(4)
      expect(new Set(question.choices).size).toBe(4)
      expect(question.choices).toContain(question.answer)
      expect(CHART.find((k) => k.katakana === question.kana)?.romaji).toBe(question.answer)
    }
  })

  it('never offers the twin kana (じ / ぢ) as a second "ji"', () => {
    const pool = drillPool(CHART, ['dakuten']).concat(kana('あ', 'ア', 'a'))
    const question = drillQuestion(pool, 'hiragana', seeded([0]))
    expect(question.choices.filter((c) => c === 'ji').length).toBeLessThanOrEqual(1)
  })

  it('does not repeat the previous kana', () => {
    const pool = drillPool(CHART, ['basic'])
    for (let i = 0; i < 25; i++) expect(drillQuestion(pool, 'hiragana', Math.random, 'あ').kana).not.toBe('あ')
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
    expect(cardFromTranslation(result, 'ja')).toEqual({ term: 'みず', reading: 'mizu', meaning: 'water', notes: '' })
  })

  it('works when translating out of the learning language', () => {
    const reverse: Translation = { ...result, text: 'みず', translation: 'water', from: 'ja', to: 'en', textReading: 'mizu', translationReading: '' }
    expect(cardFromTranslation(reverse, 'ja')).toEqual({ term: 'みず', reading: 'mizu', meaning: 'water', notes: '' })
  })

  it('makes no card when neither side is the learning language', () => {
    expect(cardFromTranslation(result, 'de')).toBeNull()
  })
})
