export const LINGO_BASE = '/projects/lingo'

export const lingoPaths = {
  translate: LINGO_BASE,
  cards: `${LINGO_BASE}/cards`,
  review: `${LINGO_BASE}/review`,
  quiz: `${LINGO_BASE}/quiz`,
  kana: `${LINGO_BASE}/kana`,
} as const
