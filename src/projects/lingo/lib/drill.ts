/** One thing to recognise in an alphabet drill: a kana or a Hangul letter and its sound. */
export interface DrillItem {
  /** What is shown, e.g. "あ", "ア" or "ㄱ". */
  symbol: string
  /** The romanization to pick, e.g. "a" or "g / k". */
  answer: string
  /** What text-to-speech reads (a lone Hangul letter is read as its syllable, 가). */
  say: string
}

export interface DrillQuestion extends DrillItem {
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

/**
 * One drill question: a symbol and four answers to pick from. Two kana can share a sound
 * (じ and ぢ are both "ji"), so wrong choices are picked by sound, not by symbol.
 */
export function drillQuestion(
  pool: readonly DrillItem[],
  random: () => number = Math.random,
  previous?: string,
): DrillQuestion {
  const candidates = pool.length > 1 ? pool.filter((item) => item.symbol !== previous) : pool
  const target = candidates[Math.floor(random() * candidates.length)]
  const others = [...new Set(pool.map((item) => item.answer))].filter((a) => a !== target.answer)
  const choices = shuffle([target.answer, ...shuffle(others, random).slice(0, 3)], random)
  return { ...target, choices }
}