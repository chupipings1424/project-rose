import type { CardInput, LanguageCode, Translation } from '../model'

export interface CardDraft {
  language: LanguageCode
  input: CardInput
}

/**
 * The flashcard a translation would make. The term is the side in the language you are
 * learning; if neither side is, it is the side that is not English (the foreign word),
 * and for two non-English languages the one you translated into.
 */
export function cardFromTranslation(result: Translation, learning: LanguageCode): CardDraft {
  const target = result.to
  const source = result.from
  const termSide =
    target === learning ? 'to' : source === learning ? 'from' : target !== 'en' ? 'to' : 'from'
  return termSide === 'to'
    ? { language: target, input: { term: result.translation, reading: result.translationReading, meaning: result.text, notes: '' } }
    : { language: source, input: { term: result.text, reading: result.textReading, meaning: result.translation, notes: '' } }
}