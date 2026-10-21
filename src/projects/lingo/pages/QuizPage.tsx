import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { useToast } from '../../../components/toast/useToast'
import { useAsync } from '../../../hooks/useAsync'
import { lingoApi } from '../api/client'
import { SpeakButton } from '../components/SpeakButton'
import { canSpeak, speak } from '../lib/speech'
import type { Language, QuizQuestion, QuizResult } from '../model'
import { lingoPaths } from '../paths'

interface QuizPageProps {
  language: Language
}

/** The optional daily quiz: five questions, once a day per language, keeps the streak alive. */
export default function QuizPage({ language }: QuizPageProps) {
  const quiz = useAsync(() => lingoApi.quiz(language.code), [language.code])

  if (quiz.error && !quiz.data) return <ErrorState error={quiz.error} onRetry={quiz.reload} />
  if (!quiz.data) return <LoadingState label="Preparing today's quiz…" />
  const { completed, cardsNeeded, questions } = quiz.data
  if (completed) return <QuizDone result={completed} language={language} />
  if (cardsNeeded > 0)
    return (
      <EmptyState title="Not enough cards yet">
        The quiz needs {cardsNeeded} more {language.name} card{cardsNeeded === 1 ? '' : 's'}. Add some in{' '}
        <Link to={lingoPaths.cards}>Cards</Link>.
      </EmptyState>
    )
  return <QuizRun questions={questions} language={language} onFinished={quiz.reload} />
}

interface QuizRunProps {
  questions: QuizQuestion[]
  language: Language
  onFinished: () => void
}

const QUESTION_TEXT: Record<QuizQuestion['kind'], string> = {
  meaning: 'What does this mean?',
  term: 'Which word means this?',
  listen: 'Listen. What does it mean?',
}

function QuizRun({ questions, language, onFinished }: QuizRunProps) {
  const notify = useToast()
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
      await lingoApi.submitQuiz(language.code, answers)
      onFinished()
    } catch (error) {
      notify((error as Error).message, 'error')
      setSubmitting(false)
    }
  }

  const answered = picked !== null
  const showPrompt = !listening || answered

  return (
    <section className="card lingo-quiz" aria-live="polite">
      <p className="muted small">
        Question {question.number} of {questions.length}
      </p>
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

function QuizDone({ result, language }: { result: QuizResult; language: Language }) {
  const stats = useAsync(() => lingoApi.stats(language.code), [language.code])
  const streak = stats.data?.streak
  return (
    <section className="card lingo-done">
      <p className="lingo-big">{result.score === result.total ? '🏆' : '✓'}</p>
      <h2 className="section-title">Today's {language.name} quiz is done</h2>
      <p className="lingo-score">
        {result.score} / {result.total}
      </p>
      {streak !== undefined && (
        <p className="lingo-streak">
          🔥 {streak}-day streak
        </p>
      )}
      <p className="muted small">Missed words were moved to today's reviews. A new quiz unlocks tomorrow.</p>
      <Link className="btn ghost" to={lingoPaths.review}>
        Go to reviews
      </Link>
    </section>
  )
}
