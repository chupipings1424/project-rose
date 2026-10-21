import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { useToast } from '../../../components/toast/useToast'
import { useAsync } from '../../../hooks/useAsync'
import { lingoApi } from '../api/client'
import { SpeakButton } from '../components/SpeakButton'
import type { Card, Grade, Language } from '../model'
import { lingoPaths } from '../paths'

const GRADES: { grade: Grade; label: string; hint: string }[] = [
  { grade: 'again', label: 'Again', hint: 'forgot' },
  { grade: 'hard', label: 'Hard', hint: 'barely' },
  { grade: 'good', label: 'Good', hint: 'got it' },
  { grade: 'easy', label: 'Easy', hint: 'instant' },
]

interface ReviewPageProps {
  language: Language
}

export default function ReviewPage({ language }: ReviewPageProps) {
  const due = useAsync(() => lingoApi.due(language.code), [language.code])

  if (due.error && !due.data) return <ErrorState error={due.error} onRetry={due.reload} />
  if (!due.data) return <LoadingState label="Finding due cards…" />
  if (due.data.length === 0)
    return (
      <EmptyState title="Nothing to review">
        All caught up. Add cards in <Link to={lingoPaths.cards}>Cards</Link> or come back tomorrow.
      </EmptyState>
    )
  // A new set of due cards means a fresh session (the key resets its state).
  return <ReviewSession key={due.data.map((c) => c.id).join()} cards={due.data} language={language} onRestart={due.reload} />
}

interface ReviewSessionProps {
  cards: Card[]
  language: Language
  onRestart: () => void
}

/** Flashcard loop: see the word, try to recall, reveal, grade. "Again" sends it to the back of the queue. */
function ReviewSession({ cards, language, onRestart }: ReviewSessionProps) {
  const notify = useToast()
  const [queue, setQueue] = useState(cards)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const current = queue[0]

  const grade = useCallback(
    async (value: Grade) => {
      if (!current || busy) return
      setBusy(true)
      try {
        const updated = await lingoApi.review(current.id, value)
        setQueue((previous) => (value === 'again' ? [...previous.slice(1), updated] : previous.slice(1)))
        setReviewed((n) => n + 1)
        setRevealed(false)
      } catch (error) {
        notify((error as Error).message, 'error')
      } finally {
        setBusy(false)
      }
    },
    [current, busy, notify],
  )

  // Keyboard: Space / Enter reveals, 1-4 grades.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return
      if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault()
        setRevealed(true)
      } else if (revealed) {
        const index = Number(event.key) - 1
        if (index >= 0 && index < GRADES.length) void grade(GRADES[index].grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, grade])

  if (!current)
    return (
      <section className="card lingo-done">
        <p className="lingo-big">🎉</p>
        <h2 className="section-title">Session complete</h2>
        <p className="muted">
          {reviewed} review{reviewed === 1 ? '' : 's'} done. The next ones are scheduled by how well you knew them.
        </p>
        <button type="button" className="btn ghost" onClick={onRestart}>
          Check for more
        </button>
      </section>
    )

  return (
    <section className="card lingo-flash" aria-live="polite">
      <p className="muted small">
        {queue.length} left · {reviewed} reviewed
      </p>
      <p className="lingo-flash-term" lang={language.code}>
        {current.term}
      </p>
      <SpeakButton text={current.term} lang={language.speech} />
      {revealed ? (
        <>
          {current.reading && <p className="lingo-reading">{current.reading}</p>}
          <p className="lingo-flash-meaning">{current.meaning}</p>
          {current.notes && <p className="muted small">{current.notes}</p>}
          <div className="lingo-grades" role="group" aria-label="How well did you know it?">
            {GRADES.map((g, i) => (
              <button
                key={g.grade}
                type="button"
                className={`btn ${g.grade === 'again' ? 'danger' : g.grade === 'good' ? 'primary' : 'ghost'}`}
                onClick={() => void grade(g.grade)}
                disabled={busy}
              >
                {g.label}
                <span className="lingo-key">
                  {i + 1} · {g.hint}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <button type="button" className="btn primary" onClick={() => setRevealed(true)}>
          Show answer <span className="lingo-key">Space</span>
        </button>
      )}
    </section>
  )
}
