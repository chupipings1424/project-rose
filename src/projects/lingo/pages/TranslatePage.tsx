import { useState, type FormEvent } from 'react'
import { useToast } from '../../../components/toast/useToast'
import { useAsync } from '../../../hooks/useAsync'
import { lingoApi } from '../api/client'
import { SpeakButton } from '../components/SpeakButton'
import { cardFromTranslation } from '../lib/translation'
import { DEFAULT_FROM, DEFAULT_TO, LANGUAGES, languageOf, type LanguageCode, type Translation } from '../model'

const MAX_LENGTH = 500

interface TranslatePageProps {
  /** The language picked on Flashcards / Quiz: "Save as card" prefers that deck. */
  learning: LanguageCode
}

/** The main screen: an offline translator. Saving a result as a flashcard is optional. */
export default function TranslatePage({ learning }: TranslatePageProps) {
  const notify = useToast()
  const status = useAsync(() => lingoApi.translatorStatus(), [])
  const [from, setFrom] = useState<LanguageCode>(DEFAULT_FROM)
  const [to, setTo] = useState<LanguageCode>(DEFAULT_TO)
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
      status.reload() // "not installed" / "loaded" may have changed
    }
  }

  const draft = result ? cardFromTranslation(result, learning) : null

  async function saveCard() {
    if (!draft) return
    try {
      await lingoApi.createCard(draft.language, draft.input)
      setSaved(true)
      notify(`Saved to your ${languageOf(draft.language).name} flashcards`, 'success')
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not save the card.', 'error')
    }
  }

  const notInstalled = status.data && !status.data.installed

  return (
    <div className="lingo-page">
      {notInstalled && (
        <section className="card lingo-setup" role="status">
          <h2 className="section-title">Install the offline translator</h2>
          <p>{status.data?.message}</p>
          <ol className="lingo-steps">
            <li>
              On a PC with internet, double-click <code>setup-lingo.cmd</code> in the <code>project-rose-api</code> folder (about 1 GB, one time).
            </li>
            <li>
              Other laptops: copy <code>project-rose-api\data\models</code> to the same place there. No internet needed.
            </li>
            <li>Restart ROSE.</li>
          </ol>
          <p className="muted small">Flashcards, quizzes and the alphabet work without it.</p>
        </section>
      )}

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
              placeholder="Type a word or a few sentences…"
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
          Runs offline on this PC ({status.data?.engine ?? 'NLLB-200'}) - your text never leaves it.
          {status.data?.installed && !status.data.loaded && ' The first translation takes a few seconds while the model loads.'}
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
          {draft && (
            <div className="form-actions span-all">
              <button type="button" className="btn ghost" onClick={() => void saveCard()} disabled={saved}>
                {saved ? '✓ Saved' : `＋ Save as ${languageOf(draft.language).name} card`}
              </button>
              <span className="muted small">Optional - for Flashcards and quizzes.</span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}