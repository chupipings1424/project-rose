import { useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import NotFoundPage from '../../pages/NotFoundPage'
import { DEFAULT_LANGUAGE, isLanguageCode, LANGUAGES, languageOf, type LanguageCode } from './model'
import AlphabetPage from './pages/AlphabetPage'
import CardsPage from './pages/CardsPage'
import QuizPage from './pages/QuizPage'
import ReviewPage from './pages/ReviewPage'
import TranslatePage from './pages/TranslatePage'
import { lingoPaths } from './paths'
import './lingo.css'

/** Remembers which language you are studying (Flashcards and Quiz) between visits. */
export const LANGUAGE_KEY = 'rose.lingo.language'

function savedLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    return isLanguageCode(saved) ? saved : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

const TABS = [
  { to: lingoPaths.translate, label: 'Translate', end: true },
  { to: lingoPaths.cards, label: 'Flashcards', end: false },
  { to: lingoPaths.quiz, label: 'Quiz', end: false },
  { to: lingoPaths.alphabet, label: 'Alphabet', end: false },
]

/** Project 04. Nested routes: these paths are relative to /projects/lingo/ */
export default function LingoApp() {
  const [code, setCode] = useState<LanguageCode>(savedLanguage)
  const language = languageOf(code)
  const { pathname } = useLocation()
  // Translate has its own From / To and the Alphabet its own scripts; only decks need "Learning".
  const usesDeck = pathname.startsWith(lingoPaths.cards) || pathname.startsWith(lingoPaths.quiz)

  function choose(next: LanguageCode) {
    setCode(next)
    try {
      localStorage.setItem(LANGUAGE_KEY, next)
    } catch {
      // private mode: the choice just will not be remembered
    }
  }

  return (
    <div className="lingo">
      <div className="lingo-head">
        <div>
          <p className="eyebrow">Project 04</p>
          <h1 className="display lingo-title">ROSE Lingo</h1>
        </div>
        <nav className="subnav lingo-tabs" aria-label="ROSE Lingo">
          {TABS.map((tab) => (
            <NavLink key={tab.label} to={tab.to} end={tab.end}>
              {tab.label}
            </NavLink>
          ))}
        </nav>
        {usesDeck && (
          <label className="lingo-language">
            Learning
            <select value={code} onChange={(e) => choose(e.target.value as LanguageCode)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} · {l.nativeName}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* key={code}: switching language remounts the page so nothing from the old language lingers. */}
      <Routes>
        <Route index element={<TranslatePage learning={code} />} />
        <Route path="cards" element={<CardsPage key={code} language={language} />} />
        <Route path="cards/review" element={<ReviewPage key={code} language={language} />} />
        <Route path="quiz" element={<QuizPage key={code} language={language} />} />
        <Route path="alphabet" element={<AlphabetPage />} />
        {/* Old addresses from before the redesign. */}
        <Route path="review" element={<Navigate to={lingoPaths.review} replace />} />
        <Route path="kana" element={<Navigate to={lingoPaths.alphabet} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}