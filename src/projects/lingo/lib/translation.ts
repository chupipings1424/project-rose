import type { CardInput, LanguageCode, Translation } from '../model'

/** The card a translation would make: the learning-language side is the term, the other side the meaning. */
export function cardFromTranslation(result: Translation, learning: LanguageCode): CardInput | null {
  if (result.to === learning)
    return { term: result.translation, reading: result.translationReading, meaning: result.text, notes: '' }
  if (result.from === learning) return { term: result.text, reading: result.textReading, meaning: result.translation, notes: '' }
  return null
}
