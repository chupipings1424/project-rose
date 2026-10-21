import { useState, type FormEvent } from 'react'
import { useToast } from '../../../components/toast/useToast'
import { lingoApi } from '../api/client'
import { SpeakButton } from '../components/SpeakButton'
import { cardFromTranslation } from '../lib/translation'
import { LANGUAGES, languageOf, type Language, type LanguageCode, type Translation } from '../model'

const MAX_LENGTH = 500

interface TranslatePageProps {
  language: Language
}

export default function TranslatePage({ language }: TranslatePageProps) {
  const notify = useToast()
  const [from, setFrom] = useState<LanguageCode>(language.code === 'en' ? 'ja' : 'en')
  const [to, setTo] = useState<LanguageCode>(language.code)
  const [text, setText] = useState('')
  const [result, setResult] = useState<Translation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Picking the same language on both sides swaps them instead of blocking you.
  function pickFrom(code: LanguageCode) {
    if (code === to) setTo(from)
    setFrom(code)
  }
  function pickTo(code: LanguageCode) {
    if (code === from) setFrom(to)
    setTo(code)
  }
  function swap() {
    setFrom(to)
    setTo(from)
    if (result) setText(result.translation)
    setResult(null)
  }

  async function translate(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      setResult(await lingoApi.translate(text.trim(), from, to))
    } catch (caught) {
      setResult(null)
      setError(caught instanceof Error ? caught.message : 'Translation failed.')
    } finally {
      setBusy(false)
    }
  }

  const card = result ? cardFromTranslation(result, language.code) : null

  async function saveCard() {
    if (!card) return
    try {
      await lingoApi.createCard(language.code, card)
      setSaved(true)
      notify('Saved as a flashcard', 'success')
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not save the card.', 'error')
    }
  }

  return (
    <div className="lingo-page">
      <section className="card">
        <h2 className="section-title">Translate</h2>
        <form className="stack-form" onSubmit={translate}>
          <div className="lingo-pair">
            <label>
              From
              <select value={from} onChange={(e) => pickFrom(e.target.value as LanguageCode)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="icon-btn" onClick={swap} aria-label="Swap languages" title="Swap">
              ⇄
            </button>
            <label>
              To
              <select value={to} onChange={(e) => pickTo(e.target.value as LanguageCode)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Text
            <textarea
              lang={from}
              rows={3}
              value={text}
              maxLength={MAX_LENGTH}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a word or a short sentence…"
              required
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={busy || !text.trim()}>
              {busy ? 'Translating…' : 'Translate'}
            </button>
            <span className="muted small">
              {text.length}/{MAX_LENGTH}
            </span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
        <p className="muted small">
          Translations come from the free MyMemory service, so the text leaves your PC. Do not paste anything private.
        </p>
      </section>

      {result && (
        <section className="card lingo-result" aria-live="polite">
          <div className="lingo-result-side">
            <p className="eyebrow">{languageOf(result.from).name}</p>
            <p className="lingo-big" lang={result.from}>
              {result.text} <SpeakButton text={result.text} lang={languageOf(result.from).speech} />
            </p>
            {result.textReading && <p className="lingo-reading">{result.textReading}</p>}
          </div>
          <div className="lingo-result-side">
            <p className="eyebrow">{languageOf(result.to).name}</p>
            <p className="lingo-big" lang={result.to}>
              {result.translation} <SpeakButton text={result.translation} lang={languageOf(result.to).speech} />
            </p>
            {result.translationReading && <p className="lingo-reading">{result.translationReading}</p>}
          </div>
          {card && (
            <div className="form-actions span-all">
              <button type="button" className="btn ghost" onClick={() => void saveCard()} disabled={saved}>
                {saved ? '✓ Saved' : '＋ Save as card'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
