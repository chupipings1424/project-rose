import { useMemo, useState } from 'react'
import { ErrorState, LoadingState } from '../../../components/States'
import { useAsync } from '../../../hooks/useAsync'
import { lingoApi } from '../api/client'
import { drillPool, drillQuestion, type Script } from '../lib/kanaDrill'
import { canSpeak, speak } from '../lib/speech'
import type { KanaEntry, KanaGroup } from '../model'

const LEVELS: { id: string; label: string; groups: KanaGroup[] }[] = [
  { id: 'basic', label: 'Basic 46', groups: ['basic'] },
  { id: 'voiced', label: '+ Voiced (゛゜)', groups: ['basic', 'dakuten'] },
  { id: 'all', label: 'All', groups: ['basic', 'dakuten', 'combo'] },
]

/** Hiragana / katakana practice: a quick multiple-choice drill and the full chart. */
export default function KanaPage() {
  const chart = useAsync(() => lingoApi.kana(), [])
  const [script, setScript] = useState<Script>('hiragana')
  const [level, setLevel] = useState(LEVELS[0].id)

  if (chart.error && !chart.data) return <ErrorState error={chart.error} onRetry={chart.reload} />
  if (!chart.data) return <LoadingState label="Loading kana…" />

  const groups = LEVELS.find((l) => l.id === level)?.groups ?? ['basic']

  return (
    <div className="lingo-page">
      <section className="card">
        <div className="lingo-list-head">
          <h2 className="section-title">Kana drill</h2>
          <div className="lingo-chips" role="group" aria-label="Script">
            {(['hiragana', 'katakana'] as const).map((s) => (
              <button key={s} type="button" className={`lingo-chip ${script === s ? 'is-on' : ''}`} aria-pressed={script === s} onClick={() => setScript(s)}>
                {s === 'hiragana' ? 'Hiragana あ' : 'Katakana ア'}
              </button>
            ))}
          </div>
          <div className="lingo-chips" role="group" aria-label="Level">
            {LEVELS.map((l) => (
              <button key={l.id} type="button" className={`lingo-chip ${level === l.id ? 'is-on' : ''}`} aria-pressed={level === l.id} onClick={() => setLevel(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
        {/* A new script or level starts a fresh drill (the key resets its state). */}
        <KanaDrill key={`${script}-${level}`} pool={drillPool(chart.data, groups)} script={script} />
      </section>

      <section className="card">
        <h2 className="section-title">Chart</h2>
        <p className="muted small">{canSpeak() ? 'Click a kana to hear it.' : 'Romaji under each kana.'}</p>
        <KanaChart chart={chart.data} script={script} />
      </section>
    </div>
  )
}

function KanaDrill({ pool, script }: { pool: KanaEntry[]; script: Script }) {
  const [question, setQuestion] = useState(() => drillQuestion(pool, script))
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })

  function pick(choice: string) {
    if (picked) return
    setPicked(choice)
    setScore((s) => ({ right: s.right + (choice === question.answer ? 1 : 0), total: s.total + 1 }))
    speak(question.kana, 'ja-JP')
  }

  function next() {
    setQuestion(drillQuestion(pool, script, Math.random, question.kana))
    setPicked(null)
  }

  return (
    <div className="lingo-drill">
      <p className="muted small">
        Score {score.right} / {score.total}
      </p>
      <p className="lingo-kana-big" lang="ja">
        {question.kana}
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

const GROUP_TITLES: Record<KanaGroup, string> = {
  basic: 'Basic',
  dakuten: 'Voiced (dakuten ゛ / handakuten ゜)',
  combo: 'Combinations (small ゃ ゅ ょ)',
}

function KanaChart({ chart, script }: { chart: KanaEntry[]; script: Script }) {
  const byGroup = useMemo(() => {
    const groups = new Map<KanaGroup, KanaEntry[]>()
    for (const entry of chart) groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry])
    return groups
  }, [chart])

  return (
    <>
      {[...byGroup].map(([group, entries]) => (
        <div key={group}>
          <h3 className="eyebrow">{GROUP_TITLES[group]}</h3>
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
