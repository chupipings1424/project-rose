import type { KanaEntry, KanaGroup } from '../model'

export type Script = 'hiragana' | 'katakana'

export interface DrillQuestion {
  kana: string
  answer: string
  choices: string[]
}

/** Fisher-Yates shuffle into a new array. `random` is injectable so tests are repeatable. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function drillPool(chart: readonly KanaEntry[], groups: readonly KanaGroup[]): KanaEntry[] {
  return chart.filter((k) => groups.includes(k.group))
}

/**
 * One drill question: a kana and four romaji to pick from. Two kana can share a romaji
 * (じ and ぢ are both "ji"), so wrong choices are picked by sound, not by kana.
 */
export function drillQuestion(
  pool: readonly KanaEntry[],
  script: Script,
  random: () => number = Math.random,
  previous?: string,
): DrillQuestion {
  const candidates = pool.length > 1 ? pool.filter((k) => k[script] !== previous) : pool
  const target = candidates[Math.floor(random() * candidates.length)]
  const others = [...new Set(pool.map((k) => k.romaji))].filter((r) => r !== target.romaji)
  const choices = shuffle([target.romaji, ...shuffle(others, random).slice(0, 3)], random)
  return { kana: target[script], answer: target.romaji, choices }
}
