import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MicIcon } from '../components/icons'
import { useToast } from '../components/toast/useToast'
import { useCurrency } from '../currency/useCurrency'
import { nowTime, shortDate, todayIso } from '../lib/format'
import { useOffline } from '../lib/offline'
import { submit, type OutboxRequest } from '../lib/outbox'
import { workbookApi } from '../projects/workbook/api/client'
import { openQuickAdd } from '../quickadd/openQuickAdd'
import { expenseRequest, paymentRequest, QUEUED_MESSAGE, reminderRequest } from '../quickadd/requests'
import type { CommandDraft } from './draft'
import { EXAMPLES, parseCommand } from './parse'

/**
 * The smart command bar: type (or say) "kape 50", check the preview card, tap Save.
 *
 * Nothing is ever saved straight from what you typed or said - the preview always comes
 * first, and "Edit" opens quick add with everything filled in. Saving goes through the
 * outbox, so it also works offline.
 *
 * The mic uses the browser's Web Speech API. Chrome on Android sends the audio to Google
 * to turn it into text, so it needs internet; on an iPhone home-screen app it often isn't
 * available at all - then the keyboard's own mic button does the same job.
 */

// The Web Speech API isn't in TypeScript's built-in types everywhere, so describe the
// small part we use. `webkitSpeechRecognition` is the prefixed name Safari and Chrome use.
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function speechRecognition(): SpeechRecognitionConstructor | undefined {
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition
}

const MIC_BLOCKED = "ROSE can't use the mic - allow it in Settings, or tap the mic on your keyboard instead."
const MIC_FAILED = "Voice isn't available here - tap the mic on your keyboard instead."
const MIC_SILENT = 'Walang narinig - tap the mic and try again.'

interface Lookups {
  titles: string[]
  /** Budget expense lines this year: name -> group. */
  groups: Map<string, { item: string; group: string }>
}

interface Preview {
  draft: CommandDraft
  /** Payments only: what the title's plan says. */
  planAmount?: number | null
  dueDate?: string
}

const KIND_LABEL: Record<CommandDraft['kind'], string> = { expense: 'Expense', payment: 'Payment', reminder: 'Reminder' }

function whenLabel(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

interface CommandBarProps {
  /** Inside quick add: no title row. */
  compact?: boolean
  /** "Edit": open the form with the draft. Defaults to opening quick add. */
  onEdit?: (draft: CommandDraft) => void
  onSaved?: () => void
}

export default function CommandBar({ compact = false, onEdit = openQuickAdd, onSaved }: CommandBarProps) {
  const { money } = useCurrency()
  const notify = useToast()
  const offline = useOffline()
  const [text, setText] = useState('')
  const [hint, setHint] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [saving, setSaving] = useState(false)
  const [listening, setListening] = useState(false)
  const recognition = useRef<SpeechRecognitionLike | null>(null)
  const lookups = useRef<Promise<Lookups> | null>(null)
  const [canListen] = useState(() => !!speechRecognition())

  // Stop the mic if the bar disappears (dialog closed, page changed).
  useEffect(() => () => recognition.current?.abort(), [])

  /** Titles and budget items, fetched once on first use (offline: the saved copy). */
  function loadLookups(): Promise<Lookups> {
    lookups.current ??= Promise.all([
      workbookApi.accounts().catch(() => []),
      workbookApi.budget(new Date().getFullYear()).catch(() => null),
    ]).then(([accounts, budget]) => {
      const groups = new Map<string, { item: string; group: string }>()
      for (const section of budget?.sections ?? []) {
        if (section.name !== 'Expense') continue
        for (const group of section.groups) {
          for (const line of group.lines) groups.set(line.item.trim().toLowerCase(), { item: line.item, group: line.group })
        }
      }
      return { titles: accounts.map((a) => a.title), groups }
    })
    return lookups.current
  }

  async function showPreview(said: string) {
    const found = await loadLookups()
    const result = parseCommand(said, { now: new Date(), titles: found.titles, items: [...found.groups.values()].map((v) => v.item) })
    if (!result.ok) {
      setPreview(null)
      setHint(result.hint)
      return
    }
    setHint('')
    const { draft } = result
    if (draft.kind !== 'payment') {
      setPreview({ draft })
      return
    }
    // A payment needs its plan: the usual amount and the next due date.
    const summary = await workbookApi.summary(draft.title).catch(() => null)
    setPreview({
      draft,
      planAmount: summary?.has_plan ? summary.per_payment : null,
      dueDate: summary?.next_due_date ?? '',
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void showPreview(text)
  }

  function listen() {
    if (listening) {
      recognition.current?.stop()
      return
    }
    const Recognition = speechRecognition()
    if (!Recognition) return
    const mic = new Recognition()
    mic.lang = 'en-PH'
    mic.interimResults = false
    mic.maxAlternatives = 1
    mic.continuous = false
    mic.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript?.trim() ?? ''
      if (!said) return
      setText(said)
      void showPreview(said)
    }
    mic.onerror = (event) => {
      if (event.error === 'aborted') return
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setHint(MIC_BLOCKED)
      else if (event.error === 'no-speech') setHint(MIC_SILENT)
      else setHint(MIC_FAILED)
    }
    mic.onend = () => setListening(false)
    recognition.current = mic
    setHint('')
    setListening(true)
    try {
      mic.start()
    } catch {
      setListening(false)
      setHint(MIC_FAILED)
    }
  }

  function requestFor(shown: Preview, groups: Lookups['groups']): OutboxRequest | null {
    const { draft } = shown
    if (draft.kind === 'expense') {
      const line = groups.get(draft.item.trim().toLowerCase())
      return expenseRequest({ item: line?.item ?? draft.item, group: line?.group ?? 'Other', amount: String(draft.amount), date: draft.date }, money)
    }
    if (draft.kind === 'reminder') return reminderRequest({ text: draft.text, dueAt: draft.dueAt, repeat: 'none' })
    const amount = draft.amount ?? shown.planAmount
    if (amount == null) return null
    return paymentRequest(
      { title: draft.title, amount: String(amount), date: draft.date, time: nowTime(), status: 'Paid', due_date: shown.dueDate ?? '', note: '' },
      money,
    )
  }

  async function save() {
    if (!preview) return
    const request = requestFor(preview, (await loadLookups()).groups)
    if (!request) return
    setSaving(true)
    try {
      const result = await submit(request)
      if (result.status === 'queued') notify(QUEUED_MESSAGE, 'info')
      else notify(`${KIND_LABEL[preview.draft.kind]} saved`, 'success')
      setText('')
      setPreview(null)
      onSaved?.()
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function edit() {
    if (!preview) return
    const { draft } = preview
    onEdit(draft.kind === 'payment' && draft.amount == null && preview.planAmount != null ? { ...draft, amount: preview.planAmount } : draft)
    setPreview(null)
  }

  const details = preview ? describe(preview, money) : null
  const placeholder = `e.g. "${EXAMPLES[0]}" or "${EXAMPLES[3]}"`

  return (
    <div className={`command-bar${compact ? ' is-compact' : ''}`}>
      <form className="command-form" onSubmit={handleSubmit}>
        <input
          type="text"
          aria-label="Command"
          placeholder={placeholder}
          value={text}
          autoComplete="off"
          enterKeyHint="go"
          onFocus={() => void loadLookups()}
          onChange={(e) => {
            setText(e.target.value)
            setHint('')
          }}
        />
        {canListen && !offline && (
          <button
            type="button"
            className={`btn ghost mic-btn${listening ? ' is-listening' : ''}`}
            aria-label={listening ? 'Stop listening' : 'Speak a command'}
            aria-pressed={listening}
            onClick={listen}
          >
            <MicIcon />
          </button>
        )}
        <button type="submit" className="btn primary" disabled={!text.trim()}>
          Preview
        </button>
      </form>
      {listening && (
        <p className="command-hint small" role="status">
          Listening... say e.g. &quot;kape singkwenta&quot;
        </p>
      )}
      {hint && (
        <p className="command-hint small" role="status">
          {hint}
        </p>
      )}
      {preview && details && (
        <div className="command-preview" role="group" aria-label="Preview">
          <span className="chip is-on command-kind">{KIND_LABEL[preview.draft.kind]}</span>
          <div className="command-main">
            <strong>{details.main}</strong>
            <span className="muted small">{details.detail}</span>
            {details.problem && <span className="form-warning small">{details.problem}</span>}
          </div>
          <div className="command-actions">
            <button type="button" className="btn primary" disabled={saving || !!details.problem} onClick={() => void save()}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="btn ghost" onClick={edit}>
              Edit
            </button>
            <button type="button" className="btn ghost" aria-label="Cancel" onClick={() => setPreview(null)}>
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function describe(shown: Preview, money: (value: number) => string): { main: string; detail: string; problem?: string } {
  const { draft } = shown
  const day = (iso: string) => (iso === todayIso() ? 'Today' : shortDate(iso))
  if (draft.kind === 'expense') return { main: `${draft.item} \u00b7 ${money(draft.amount)}`, detail: `${day(draft.date)} \u00b7 added to the budget` }
  if (draft.kind === 'reminder') return { main: draft.text, detail: whenLabel(draft.dueAt) }
  const amount = draft.amount ?? shown.planAmount
  if (amount == null) return { main: draft.title, detail: 'Paid', problem: 'No plan amount for this title - tap Edit to type it.' }
  return {
    main: `${draft.title} \u00b7 ${money(amount)}`,
    detail: `Paid ${day(draft.date).toLowerCase() === 'today' ? 'today' : day(draft.date)}${draft.amount == null ? ' \u00b7 plan amount' : ''}`,
  }
}