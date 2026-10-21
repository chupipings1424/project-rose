import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { useToast } from '../../../components/toast/useToast'
import { useAsync } from '../../../hooks/useAsync'
import { lingoApi } from '../api/client'
import { SpeakButton } from '../components/SpeakButton'
import { canSpeak, speak } from '../lib/speech'
import {
  QUIZ_MIN_CARDS,
  QUIZ_SIZES,
  type Card,
  type Language,
  type Quiz,
  type QuizQuestion,
  type QuizResult,
} from '../model'
import { lingoPaths } from '../paths'

/** The API refuses bigger hand-made quizzes. */
const MAX_PICKED = 50

type Stage = { kind: 'start' } | { kind: 'run'; quiz: Quiz } | { kind: 'done'; result: QuizResult }

interface QuizPageProps {
  language: Language
}

/** On-demand quizzes: take one of 5 / 10 / 20 random cards, or make one from cards you pick. */
export default function QuizPage({ language }: QuizPageProps) {
  const notify = useToast()
  const cards = useAsync(() => lingoApi.cards(language.code), [language.code])
  const history = useAsync(() => lingoApi.quizHistory(language.code), [language.code])
  const [stage, setStage] = useState<Stage>({ kind: 'start' })
  const [starting, setStarting] = useState(false)

  async function start(load: () => Promise<Quiz>) {
    setStarting(true)
    try {
      const quiz = await load()
      if (quiz.questions.length === 0) {
        notify(`Add ${Math.max(quiz.cardsNeeded, 1)} more ${language.name} card(s) first.`, 'error')
        return
      }
      setStage({ kind: 'run', quiz })
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setStarting(false)
    }
  }

  function finished(result: QuizResult) {
    setStage({ kind: 'done', result })
    history.reload()
    cards.reload() // missed cards are due again
  }

  if (stage.kind === 'run')
    return <QuizRun quiz={stage.quiz} language={language} onFinished={finished} onQuit={() => setStage({ kind: 'start' })} />
  if (stage.kind === 'done') return <QuizDone result={stage.result} onAgain={() => setStage({ kind: 'start' })} />

  if (cards.error && !cards.data) return <ErrorState error={cards.error} onRetry={cards.reload} />
  if (!cards.data) return <LoadingState label="Loading your cards…" />
  const needed = QUIZ_MIN_CARDS - cards.data.length
  if (needed > 0)
    return (
      <EmptyState title="Not enough cards yet">
        A quiz needs at least {QUIZ_MIN_CARDS} {language.name} cards - add {needed} more in{' '}
        <Link to={lingoPaths.cards}>Flashcards</Link>
        {language.hasStarter ? ' (or add the starter deck there)' : ''}.
      </EmptyState>
    )

  return (
    <div className="lingo-page">
      <TakeQuiz deckSize={cards.data.length} busy={starting} onStart={(count) => void start(() => lingoApi.takeQuiz(language.code, count))} />
      <MakeQuiz
        cards={cards.data}
        language={language}
        busy={starting}
        onStart={(ids) => void start(() => lingoApi.makeQuiz(language.code, ids))}
      />
      <QuizHistory results={history.data} />
    </div>
  )
}

function TakeQuiz({ deckSize, busy, onStart }: { deckSize: number; busy: boolean; onStart: (count: number) => void }) {
  const [count, setCount] = useState<number>(QUIZ_SIZES[0])
  return (
    <section className="card">
      <h2 className="section-title">Take a quiz</h2>
      <p className="muted small">Random cards from your deck of {deckSize}. Missed words go back into today's reviews.</p>
      <div className="form-actions">
        <div className="lingo-chips" role="group" aria-label="Questions">
          {QUIZ_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={`lingo-chip ${count === size ? 'is-on' : ''}`}
              aria-pressed={count === size}
              onClick={() => setCount(size)}
            >
              {size} questions
            </button>
          ))}
        </div>
        <button type="button" className="btn primary" onClick={() => onStart(count)} disabled={busy}>
          {busy ? 'Starting…' : 'Start'}
        </button>
      </div>
      {count > deckSize && <p className="muted small">You have {deckSize} cards, so this quiz asks each of them once.</p>}
    </section>
  )
}

interface MakeQuizProps {
  cards: Card[]
  language: Language
  busy: boolean
  onStart: (cardIds: string[]) => void
}

function MakeQuiz({ cards, language, busy, onStart }: MakeQuizProps) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [search, setSearch] = useState('')
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return needle ? cards.filter((c) => [c.term, c.reading, c.meaning].some((f) => f.toLowerCase().includes(needle))) : cards
  }, [cards, search])

  function toggle(id: string) {
    setPicked((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const pickAll = (ids: string[]) => setPicked((previous) => new Set([...previous, ...ids]))
  const tooMany = picked.size > MAX_PICKED

  return (
    <section className="card">
      <div className="lingo-list-head">
        <h2 className="section-title">Make a quiz</h2>
        <input
          type="search"
          className="lingo-search"
          placeholder="Search cards…"
          aria-label="Search cards to quiz"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="btn ghost" onClick={() => pickAll(visible.map((c) => c.id))}>
          Select shown
        </button>
        <button type="button" className="btn ghost" onClick={() => pickAll(cards.filter((c) => c.isDue).map((c) => c.id))}>
          Select due
        </button>
        <button type="button" className="btn ghost" onClick={() => setPicked(new Set())} disabled={picked.size === 0}>
          Clear
        </button>
      </div>
      <ul className="lingo-pick-list" aria-label="Cards to quiz">
        {visible.map((card) => (
          <li key={card.id}>
            <label className={`lingo-pick ${picked.has(card.id) ? 'is-on' : ''}`}>
              <input type="checkbox" checked={picked.has(card.id)} onChange={() => toggle(card.id)} />
              <span className="lingo-term" lang={language.code}>
                {card.term}
              </span>
              <span className="muted small">{card.meaning}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="form-actions">
        <button
          type="button"
          className="btn primary"
          onClick={() => onStart([...picked])}
          disabled={busy || picked.size === 0 || tooMany}
        >
          {busy ? 'Starting…' : `Start with ${picked.size} card${picked.size === 1 ? '' : 's'}`}
        </button>
        {tooMany && <span className="form-error">Pick at most {MAX_PICKED} cards.</span>}
      </div>
    </section>
  )
}

function QuizHistory({ results }: { results: QuizResult[] | undefined }) {
  if (!results || results.length === 0) return null
  return (
    <section className="card">
      <h2 className="section-title">Recent quizzes</h2>
      <ul className="lingo-history">
        {results.map((r) => (
          <li key={r.id}>
            <span>{new Date(r.completedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <span className="muted small">{r.mode === 'custom' ? 'Made' : 'Random'}</span>
            <strong>
              {r.score} / {r.total}
            </strong>
            <span className={r.score === r.total ? 'lingo-ok' : 'muted small'}>{Math.round((r.score / r.total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

interface QuizRunProps {
  quiz: Quiz
  language: Language
  onFinished: (result: QuizResult) => void
  onQuit: () => void
}

const QUESTION_TEXT: Record<QuizQuestion['kind'], string> = {
  meaning: 'What does this mean?',
  term: 'Which word means this?',
  listen: 'Listen. What does it mean?',
}

function QuizRun({ quiz, language, onFinished, onQuit }: QuizRunProps) {
  const notify = useToast()
  const { questions } = quiz
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answers, setAnswers] = useState<{ cardId: string; correct: boolean }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const question = questions[index]
  const listening = question.kind === 'listen' && canSpeak()

  useEffect(() => {
    if (question.kind === 'listen') speak(question.prompt, language.speech)
  }, [question, language.speech])

  function pick(choice: number) {
    if (picked !== null) return
    setPicked(choice)
    setAnswers((previous) => [...previous, { cardId: question.cardId, correct: choice === question.answer }])
  }

  async function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      setPicked(null)
      return
    }
    setSubmitting(true)
    try {
      onFinished(await lingoApi.submitQuiz(language.code, quiz.mode, answers))
    } catch (error) {
      notify((error as Error).message, 'error')
      setSubmitting(false)
    }
  }

  const answered = picked !== null
  const showPrompt = !listening || answered

  return (
    <section className="card lingo-quiz" aria-live="polite">
      <div className="lingo-list-head">
        <p className="muted small">
          Question {question.number} of {questions.length}
        </p>
        <button type="button" className="btn ghost" onClick={onQuit} disabled={submitting}>
          Quit
        </button>
      </div>
      <h2 className="section-title">{QUESTION_TEXT[question.kind]}</h2>
      <div className="lingo-quiz-prompt">
        {showPrompt && (
          <span className="lingo-flash-term" lang={question.kind === 'term' ? 'en' : language.code}>
            {question.prompt}
          </span>
        )}
        {question.kind !== 'term' && <SpeakButton text={question.prompt} lang={language.speech} />}
      </div>
      {showPrompt && question.reading && <p className="lingo-reading">{question.reading}</p>}

      <div className="lingo-choices">
        {question.choices.map((choice, i) => {
          const state = !answered ? '' : i === question.answer ? 'is-right' : i === picked ? 'is-wrong' : ''
          return (
            <button
              key={`${i}-${choice}`}
              type="button"
              className={`lingo-choice ${state}`}
              lang={question.kind === 'term' ? language.code : 'en'}
              onClick={() => pick(i)}
              disabled={answered}
            >
              {choice}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="form-actions">
          <span className={picked === question.answer ? 'lingo-ok' : 'lingo-bad'}>
            {picked === question.answer ? '✓ Correct' : '✗ Not quite'}
          </span>
          <button type="button" className="btn primary" onClick={() => void next()} disabled={submitting}>
            {index + 1 < questions.length ? 'Next' : submitting ? 'Saving…' : 'Finish'}
          </button>
        </div>
      )}
    </section>
  )
}

function QuizDone({ result, onAgain }: { result: QuizResult; onAgain: () => void }) {
  const perfect = result.score === result.total
  return (
    <section className="card lingo-done">
      <p className="lingo-big">{perfect ? '🏆' : '✓'}</p>
      <h2 className="section-title">Quiz finished</h2>
      <p className="lingo-score">
        {result.score} / {result.total}
      </p>
      <p className="muted small">
        {perfect ? 'Every answer right!' : "Missed words were moved to today's reviews."}
      </p>
      <div className="form-actions">
        <button type="button" className="btn primary" onClick={onAgain}>
          New quiz
        </button>
        <Link className="btn ghost" to={lingoPaths.review}>
          Go to reviews
        </Link>
      </div>
    </section>
  )
}