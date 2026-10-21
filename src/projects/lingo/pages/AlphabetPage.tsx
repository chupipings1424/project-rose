import { useMemo, useState } from 'react'
import { ErrorState, LoadingState } from '../../../components/States'
import { useAsync } from '../../../hooks/useAsync'
import { lingoApi } from '../api/client'
import { drillQuestion, type DrillItem } from '../lib/drill'
import { canSpeak, speak } from '../lib/speech'
import type { HangulEntry, HangulGroup, KanaEntry, KanaGroup } from '../model'

type Script = 'hiragana' | 'katakana' | 'hangul'

const SCRIPTS: { id: Script; label: string; speech: string }[] = [
  { id: 'hiragana', label: 'Hiragana あ', speech: 'ja-JP' },
  { id: 'katakana', label: 'Katakana ア', speech: 'ja-JP' },
  { id: 'hangul', label: 'Hangul 한', speech: 'ko-KR' },
]

const KANA_LEVELS: { id: string; label: string; groups: KanaGroup[] }[] = [
  { id: 'basic', label: 'Basic 46', groups: ['basic'] },
  { id: 'voiced', label: '+ Voiced (゛゜)', groups: ['basic', 'dakuten'] },
  { id: 'all', label: 'All', groups: ['basic', 'dakuten', 'combo'] },
]

const HANGUL_LEVELS: { id: string; label: string; groups: HangulGroup[] }[] = [
  { id: 'basic', label: 'Basic 24', groups: ['consonant', 'vowel'] },
  { id: 'all', label: 'All 40', groups: ['consonant', 'vowel', 'double', 'compound'] },
]

const KANA_TITLES: Record<KanaGroup, string> = {
  basic: 'Basic',
  dakuten: 'Voiced (dakuten ゛ / handakuten ゜)',
  combo: 'Combinations (small ゃ ゅ ょ)',
}

const HANGUL_TITLES: Record<HangulGroup, string> = {
  consonant: 'Consonants',
  vowel: 'Vowels',
  double: 'Double consonants (tense)',
  compound: 'Compound vowels',
}

/** What the drill shows for each script. A lone Hangul letter is spoken as its syllable (ㄱ -> 가). */
const kanaItems = (chart: KanaEntry[], script: 'hiragana' | 'katakana', groups: KanaGroup[]): DrillItem[] =>
  chart.filter((k) => groups.includes(k.group)).map((k) => ({ symbol: k[script], answer: k.romaji, say: k.hiragana }))

const hangulItems = (chart: HangulEntry[], groups: HangulGroup[]): DrillItem[] =>
  chart.filter((h) => groups.includes(h.group)).map((h) => ({ symbol: h.letter, answer: h.romanization, say: h.syllable }))

/** Japanese kana and Korean Hangul: a quick multiple-choice drill and the full chart. */
export default function AlphabetPage() {
  const kana = useAsync(() => lingoApi.kana(), [])
  const hangul = useAsync(() => lingoApi.hangul(), [])
  const [script, setScript] = useState<Script>('hiragana')
  const [level, setLevel] = useState('basic')

  const chart = script === 'hangul' ? hangul : kana
  if (chart.error && !chart.data) return <ErrorState error={chart.error} onRetry={chart.reload} />

  const levels = script === 'hangul' ? HANGUL_LEVELS : KANA_LEVELS
  const speech = SCRIPTS.find((s) => s.id === script)?.speech ?? 'ja-JP'

  function pickScript(next: Script) {
    setScript(next)
    setLevel('basic') // every script has a "basic" level
  }

  let pool: DrillItem[] = []
  if (script === 'hangul' && hangul.data) {
    pool = hangulItems(hangul.data, HANGUL_LEVELS.find((l) => l.id === level)?.groups ?? ['consonant', 'vowel'])
  } else if (script !== 'hangul' && kana.data) {
    pool = kanaItems(kana.data, script, KANA_LEVELS.find((l) => l.id === level)?.groups ?? ['basic'])
  }

  return (
    <div className="lingo-page">
      <section className="card">
        <div className="lingo-list-head">
          <h2 className="section-title">Alphabet drill</h2>
          <div className="lingo-chips" role="group" aria-label="Script">
            {SCRIPTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`lingo-chip ${script === s.id ? 'is-on' : ''}`}
                aria-pressed={script === s.id}
                onClick={() => pickScript(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="lingo-chips" role="group" aria-label="Level">
            {levels.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`lingo-chip ${level === l.id ? 'is-on' : ''}`}
                aria-pressed={level === l.id}
                onClick={() => setLevel(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        {pool.length === 0 ? (
          <LoadingState label="Loading the alphabet…" />
        ) : (
          // A new script or level starts a fresh drill (the key resets its state).
          <Drill key={`${script}-${level}`} pool={pool} speech={speech} lang={script === 'hangul' ? 'ko' : 'ja'} />
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Chart</h2>
        <p className="muted small">{canSpeak() ? 'Click a letter to hear it.' : 'The romanization is under each letter.'}</p>
        {script === 'hangul'
          ? hangul.data && <HangulChart chart={hangul.data} />
          : kana.data && <KanaChart chart={kana.data} script={script} />}
      </section>
    </div>
  )
}

function Drill({ pool, speech, lang }: { pool: DrillItem[]; speech: string; lang: string }) {
  const [question, setQuestion] = useState(() => drillQuestion(pool))
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })

  function pick(choice: string) {
    if (picked) return
    setPicked(choice)
    setScore((s) => ({ right: s.right + (choice === question.answer ? 1 : 0), total: s.total + 1 }))
    speak(question.say, speech)
  }

  function next() {
    setQuestion(drillQuestion(pool, Math.random, question.symbol))
    setPicked(null)
  }

  return (
    <div className="lingo-drill">
      <p className="muted small">
        Score {score.right} / {score.total}
      </p>
      <p className="lingo-kana-big" lang={lang}>
        {question.symbol}
      </p>
      <div className="lingo-choices">
        {question.choices.map((choice) => {
          const state = !picked ? '' : choice === question.answer ? 'is-right' : choice === picked ? 'is-wrong' : ''
          return (
            <button key={choice} type="button" className={`lingo-choice ${state}`} onClick={() => pick(choice)} disabled={picked !== null}>
              {choice}
            </button>
          )
        })}
      </div>
      {picked && (
        <div className="form-actions">
          <span className={picked === question.answer ? 'lingo-ok' : 'lingo-bad'}>
            {picked === question.answer ? '✓ Correct' : `✗ It is "${question.answer}"`}
          </span>
          <button type="button" className="btn primary" onClick={next}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}

/** Groups chart rows in their API order. */
function grouped<T, G>(entries: T[], groupOf: (entry: T) => G): [G, T[]][] {
  const groups = new Map<G, T[]>()
  for (const entry of entries) groups.set(groupOf(entry), [...(groups.get(groupOf(entry)) ?? []), entry])
  return [...groups]
}

function KanaChart({ chart, script }: { chart: KanaEntry[]; script: 'hiragana' | 'katakana' }) {
  const byGroup = useMemo(() => grouped(chart, (k) => k.group), [chart])
  return (
    <>
      {byGroup.map(([group, entries]) => (
        <div key={group}>
          <h3 className="eyebrow">{KANA_TITLES[group]}</h3>
          <div className="lingo-kana-grid">
            {entries.map((entry) => (
              <button
                key={entry.hiragana}
                type="button"
                className="lingo-kana-cell"
                onClick={() => speak(entry.hiragana, 'ja-JP')}
                aria-label={`${entry[script]} ${entry.romaji}`}
              >
                <span lang="ja">{entry[script]}</span>
                <small>{entry.romaji}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function HangulChart({ chart }: { chart: HangulEntry[] }) {
  const byGroup = useMemo(() => grouped(chart, (h) => h.group), [chart])
  return (
    <>
      {byGroup.map(([group, entries]) => (
        <div key={group}>
          <h3 className="eyebrow">{HANGUL_TITLES[group]}</h3>
          <div className="lingo-kana-grid lingo-hangul-grid">
            {entries.map((entry) => (
              <button
                key={entry.letter}
                type="button"
                className="lingo-kana-cell"
                onClick={() => speak(entry.syllable, 'ko-KR')}
                aria-label={`${entry.letter} ${entry.romanization}`}
                title={entry.name}
              >
                <span lang="ko">{entry.letter}</span>
                <small>{entry.romanization}</small>
                <small className="lingo-syllable" lang="ko">
                  {entry.syllable} {entry.syllableRomanization}
                </small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}