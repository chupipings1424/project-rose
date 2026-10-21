/**
 * Text-to-speech with the browser's built-in Web Speech API: free and offline, but the
 * voices come from Windows. No Japanese or Korean voice? Add one in Windows Settings >
 * Time & language > Speech > Add voices.
 */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

/** Reads `text` aloud in `lang` (e.g. "ja-JP"). Returns false when the browser cannot speak. */
export function speak(text: string, lang: string): boolean {
  if (!canSpeak() || !text.trim()) return false
  const synth = window.speechSynthesis
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.9
  const prefix = lang.slice(0, 2).toLowerCase()
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(prefix))
  if (voice) utterance.voice = voice
  synth.cancel() // stop anything still talking
  synth.speak(utterance)
  return true
}
