/**
 * Text-to-speech with the browser's built-in Web Speech API: free and offline, but the
 * voices come from Windows. No voice for a language? Add one in Windows Settings >
 * Time & language > Speech > Add voices.
 */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

const normalise = (tag: string) => tag.replace('_', '-').toLowerCase()

/**
 * The best installed voice for `lang`: the exact region first (zh-TW for Traditional Chinese),
 * then any voice of the same language (zh-CN), else none and the browser picks.
 */
export function pickVoice(voices: readonly SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  const wanted = normalise(lang)
  const base = wanted.split('-')[0]
  return (
    voices.find((v) => normalise(v.lang) === wanted) ?? voices.find((v) => normalise(v.lang).split('-')[0] === base)
  )
}

/** Reads `text` aloud in `lang` (e.g. "ja-JP"). Returns false when the browser cannot speak. */
export function speak(text: string, lang: string): boolean {
  if (!canSpeak() || !text.trim()) return false
  const synth = window.speechSynthesis
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.9
  const voice = pickVoice(synth.getVoices(), lang)
  if (voice) utterance.voice = voice
  synth.cancel() // stop anything still talking
  synth.speak(utterance)
  return true
}