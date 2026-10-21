import { useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import NotFoundPage from '../../pages/NotFoundPage'
import { DEFAULT_LANGUAGE, isLanguageCode, LANGUAGES, languageOf, type LanguageCode } from './model'
import CardsPage from './pages/CardsPage'
import KanaPage from './pages/KanaPage'
import QuizPage from './pages/QuizPage'
import ReviewPage from './pages/ReviewPage'
import TranslatePage from './pages/TranslatePage'
import { lingoPaths } from './paths'
import './lingo.css'

/** Remembers which language you are studying between visits. */
export const LANGUAGE_KEY = 'rose.lingo.language'

function savedLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    return isLanguageCode(saved) ? saved : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

/** Project 04. Nested routes: these paths are relative to /projects/lingo/ */
export default function LingoApp() {
  const [code, setCode] = useState<LanguageCode>(savedLanguage)
  const language = languageOf(code)

  function choose(next: LanguageCode) {
    setCode(next)
    try {
      localStorage.setItem(LANGUAGE_KEY, next)
    } catch {
      // private mode: the choice just will not be remembered
    }
  }

  const tabs = [
    { to: lingoPaths.translate, label: 'Translate', end: true },
    { to: lingoPaths.cards, label: 'Cards' },
    { to: lingoPaths.review, label: 'Review' },
    { to: lingoPaths.quiz, label: 'Daily quiz' },
    ...(code === 'ja' ? [{ to: lingoPaths.kana, label: 'Kana' }] : []),
  ]

  return (
    <div className="lingo">
      <div className="lingo-head">
        <div>
          <p className="eyebrow">Project 04</p>
          <h1 className="display lingo-title">ROSE Lingo</h1>
        </div>
        <nav className="subnav lingo-tabs" aria-label="ROSE Lingo">
          {tabs.map((tab) => (
            <NavLink key={tab.label} to={tab.to} end={tab.end ?? false}>
              {tab.label}
            </NavLink>
          ))}
        </nav>
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
      </div>

      {/* key={code}: switching language remounts the page so nothing from the old language lingers. */}
      <Routes>
        <Route index element={<TranslatePage key={code} language={language} />} />
        <Route path="cards" element={<CardsPage key={code} language={language} />} />
        <Route path="review" element={<ReviewPage key={code} language={language} />} />
        <Route path="quiz" element={<QuizPage key={code} language={language} />} />
        <Route path="kana" element={code === 'ja' ? <KanaPage /> : <Navigate to={lingoPaths.translate} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}
