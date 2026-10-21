export const LINGO_BASE = '/projects/lingo'

export const lingoPaths = {
  translate: LINGO_BASE,
  cards: `${LINGO_BASE}/cards`,
  review: `${LINGO_BASE}/cards/review`,
  quiz: `${LINGO_BASE}/quiz`,
  alphabet: `${LINGO_BASE}/alphabet`,
} as const