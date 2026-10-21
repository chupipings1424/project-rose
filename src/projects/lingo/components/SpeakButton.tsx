import { canSpeak, speak } from '../lib/speech'

interface SpeakButtonProps {
  text: string
  lang: string
  className?: string
}

/** 🔊 Reads the text aloud. Hidden when the browser has no text-to-speech. */
export function SpeakButton({ text, lang, className = 'icon-btn' }: SpeakButtonProps) {
  if (!canSpeak()) return null
  return (
    <button type="button" className={className} onClick={() => speak(text, lang)} aria-label={`Listen to ${text}`} title="Listen">
      🔊
    </button>
  )
}
