import { useRef, useState, type FormEvent } from 'react'
import type { CommandDraft } from '../commands/draft'
import { Modal } from '../components/Modal'
import { useToast } from '../components/toast/useToast'
import { useCurrency } from '../currency/useCurrency'
import { useAsync } from '../hooks/useAsync'
import { nowTime, todayIso } from '../lib/format'
import { useOffline } from '../lib/offline'
import { submit, type SubmitResult } from '../lib/outbox'
import { fromLocalInput, nextHour, toLocalInput } from '../projects/reminders/lib/time'
import { workbookApi } from '../projects/workbook/api/client'
import type { PaymentStatus } from '../projects/workbook/api/types'
import { expenseRequest, paymentRequest, QUEUED_MESSAGE, reminderRequest, type ExpenseAdded } from './requests'

const QUICK_KINDS = ['Payment', 'Expense', 'Reminder'] as const
type QuickKind = (typeof QUICK_KINDS)[number]

const KIND_OF_DRAFT: Record<CommandDraft['kind'], QuickKind> = { payment: 'Payment', expense: 'Expense', reminder: 'Reminder' }

const NEW_LINE = '__new'

/** What quick add remembers between openings, so the usual entry is one tap away. */
interface QuickPrefs {
  kind?: QuickKind
  title?: string
  line?: string
}
const PREFS_KEY = 'rose.quickadd'

function loadPrefs(): QuickPrefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as QuickPrefs
  } catch {
    return {}
  }
}

function savePrefs(change: QuickPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...change }))
  } catch {
    // Private mode or full storage: remembering is a nicety, not a requirement.
  }
}

/**
 * Shared by the three forms: save (or keep it for later when offline - see lib/outbox.ts),
 * tell the user, then either close or (after "Save & add another") reset the form.
 * Pages reload by themselves: the outbox announces every change.
 */
function useSaver(onDone: () => void) {
  const notify = useToast()
  const [saving, setSaving] = useState(false)
  // Which submit button was pressed. A ref, because it only matters inside save().
  const again = useRef(false)
  async function save(action: () => Promise<SubmitResult<unknown>>, message: string, reset: () => void) {
    setSaving(true)
    try {
      const result = await action()
      if (result.status === 'queued') notify(QUEUED_MESSAGE, 'info')
      else notify(message, 'success')
      if (again.current) {
        setSaving(false)
        reset()
      } else {
        onDone()
      }
    } catch (error) {
      notify((error as Error).message, 'error')
      setSaving(false)
    }
  }
  const buttons = (label: string) => (
    <div className="quick-actions">
      <button type="submit" className="btn primary" disabled={saving} onClick={() => { again.current = false }}>
        {saving ? 'Saving…' : label}
      </button>
      <button type="submit" className="btn ghost" disabled={saving} onClick={() => { again.current = true }}>
        Save &amp; add another
      </button>
    </div>
  )
  return { save, buttons }
}

type Draft<K extends CommandDraft['kind']> = Extract<CommandDraft, { kind: K }> | undefined

interface FormProps<K extends CommandDraft['kind']> {
  onDone: () => void
  /** Filled in by the command bar's "Edit". */
  draft?: Draft<K>
}

function PaymentForm({ onDone, draft }: FormProps<'payment'>) {
  const { money } = useCurrency()
  const accounts = useAsync(() => workbookApi.accounts(), [])
  const [title, setTitle] = useState(() => draft?.title ?? loadPrefs().title ?? '')
  // The remembered title may have been renamed or deleted since: fall back to the first one.
  const chosen = accounts.data?.some((a) => a.title === title) ? title : accounts.data?.[0]?.title || ''
  // Offline, this is the copy saved the last time the title was opened (if ever).
  const summary = useAsync(() => (chosen ? workbookApi.summary(chosen) : Promise.resolve(null)), [chosen])
  // null = "not typed yet": show the suggestion from the title's plan.
  const [amount, setAmount] = useState<string | null>(draft?.amount != null ? String(draft.amount) : null)
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [status, setStatus] = useState<PaymentStatus>('Paid')
  const [date, setDate] = useState(() => draft?.date ?? todayIso())
  const { save, buttons } = useSaver(onDone)

  const plan = summary.data
  const amountValue = amount ?? (plan?.has_plan ? String(plan.per_payment) : '')
  const dueValue = dueDate ?? plan?.next_due_date ?? ''

  if (accounts.loading && !accounts.data) return <p className="muted">Loading titles…</p>
  if (accounts.error) return <p className="form-error">{accounts.error.message}</p>
  if (!accounts.data?.length) return <p className="muted">Add a title in the Payment Tracker first.</p>

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = { title: chosen, amount: amountValue, date, time: nowTime(), status, due_date: dueValue, note: '' }
    void save(
      async () => {
        const result = await submit(paymentRequest(payload, money))
        savePrefs({ title: chosen })
        return result
      },
      `Payment saved for ${chosen}`,
      () => {
        // Back to the plan's suggestions; the next due date has moved on, so fetch it again.
        setAmount(null)
        setDueDate(null)
        summary.reload()
      },
    )
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Title
        <select
          value={chosen}
          onChange={(e) => {
            setTitle(e.target.value)
            setAmount(null)
            setDueDate(null)
          }}
        >
          {accounts.data.map((account) => (
            <option key={account.title}>{account.title}</option>
          ))}
        </select>
      </label>
      <div className="two-col">
        <label>
          Amount
          <input type="number" step="0.01" min="0" required value={amountValue} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
            <option>Paid</option>
            <option>Unpaid</option>
          </select>
        </label>
        <label>
          Date
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Due date
          <input type="date" value={dueValue} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>
      {status === 'Paid' && <p className="muted small">Paid payments are added to this month&apos;s budget automatically.</p>}
      {buttons('Save payment')}
    </form>
  )
}

function ExpenseForm({ onDone, draft }: FormProps<'expense'>) {
  const { money } = useCurrency()
  // Captured once, so the month can't change between renders.
  const [now] = useState(() => new Date())
  const year = now.getFullYear()
  const month = now.getMonth()
  const budget = useAsync(() => workbookApi.budget(year), [year])
  // Payment titles, to warn when an expense would be counted twice (see the sync note below).
  const accounts = useAsync(() => workbookApi.accounts(), [])
  // '' = not picked yet: use the draft's item if it has a line, else the remembered one.
  const [choice, setChoice] = useState(() => (draft ? '' : (loadPrefs().line ?? '')))
  const [draftItem] = useState(() => draft?.item.trim().toLowerCase() ?? '')
  const [item, setItem] = useState(draft?.item ?? '')
  const [group, setGroup] = useState('')
  const [amount, setAmount] = useState(draft ? String(draft.amount) : '')
  const { save, buttons } = useSaver(onDone)

  if (budget.loading && !budget.data) return <p className="muted">Loading budget…</p>

  // No budget (offline and never opened on this phone)? Then just type the item.
  const data = budget.data
  const lines = (data?.sections ?? []).filter((s) => s.name === 'Expense').flatMap((s) => s.groups.flatMap((g) => g.lines))
  const draftLine = draftItem ? lines.find((line) => line.item.trim().toLowerCase() === draftItem) : undefined
  const fallback = draftItem ? (draftLine?.id ?? NEW_LINE) : lines[0]?.id || NEW_LINE
  const selected = choice === NEW_LINE || lines.some((line) => line.id === choice) ? choice : fallback
  const groups = data?.known_groups.Expense ?? []
  const groupValue = group || groups[0] || 'Other'
  const monthName = data?.months[month] ?? now.toLocaleDateString(undefined, { month: 'short' })
  const line = lines.find((l) => l.id === selected)
  const itemName = (selected === NEW_LINE ? item : (line?.item ?? '')).trim()
  const lowered = itemName.toLowerCase()
  const isPaymentTitle = !!lowered && !!accounts.data?.some((a) => a.title.trim().toLowerCase() === lowered)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const spent = Number(amount)
    if (!(spent > 0) || !itemName) return
    const input = {
      item: itemName,
      group: selected === NEW_LINE ? groupValue.trim() : (line?.group ?? groupValue),
      amount: String(spent),
      // Today, not the day the dialog was opened - and a late sync still lands in this month.
      date: todayIso(),
    }
    let savedId = selected === NEW_LINE ? '' : selected
    void save(
      async () => {
        // The server adds it to this month's total itself, so two quick adds can't overwrite each other.
        const result = await submit<ExpenseAdded>(expenseRequest(input, money))
        if (result.status === 'sent') savedId = result.body.line_id
        if (savedId) savePrefs({ line: savedId })
        return result
      },
      `Added to ${monthName} expenses`,
      () => {
        // Stay on the line just used (also a brand-new one) and fetch the new totals.
        if (savedId) {
          setChoice(savedId)
          setItem('')
        }
        setAmount('')
        budget.reload()
      },
    )
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Expense
        <select value={selected} onChange={(e) => setChoice(e.target.value)}>
          {lines.map((line) => (
            <option key={line.id} value={line.id}>
              {line.group} · {line.item}
            </option>
          ))}
          <option value={NEW_LINE}>+ New item…</option>
        </select>
      </label>
      {selected === NEW_LINE && (
        <div className="two-col">
          <label>
            Item
            <input type="text" required placeholder="e.g. Groceries" value={item} onChange={(e) => setItem(e.target.value)} />
          </label>
          <label>
            Group
            <input type="text" required list="quick-groups" value={groupValue} onChange={(e) => setGroup(e.target.value)} />
            <datalist id="quick-groups">
              {groups.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
        </div>
      )}
      <label>
        Amount spent ({monthName} {year})
        <input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      {isPaymentTitle && (
        <p className="form-warning" role="alert">
          This is also a Payment Tracker title. Paid payments are added here automatically, so adding it again counts it
          twice. Use the Payment tab instead.
        </p>
      )}
      {buttons('Add expense')}
    </form>
  )
}

function ReminderForm({ onDone, draft }: FormProps<'reminder'>) {
  const [text, setText] = useState(draft?.text ?? '')
  const [when, setWhen] = useState(() => toLocalInput(draft?.dueAt ?? nextHour()))
  const { save, buttons } = useSaver(onDone)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save(
      () => submit(reminderRequest({ text: text.trim(), dueAt: fromLocalInput(when), repeat: 'none' })),
      'Reminder set',
      () => setText(''),
    )
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Remind me to
        <input type="text" required placeholder="e.g. Pay the electric bill" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <label>
        When
        <input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
      {buttons('Set reminder')}
    </form>
  )
}

/**
 * The (+) dialog: add a payment, an expense or a reminder from any page - also offline,
 * when the save waits on this phone until it can sync. `draft` opens it filled in.
 */
export default function QuickAddDialog({ onClose, draft }: { onClose: () => void; draft?: CommandDraft }) {
  const [kind, setKind] = useState<QuickKind>(() => {
    if (draft) return KIND_OF_DRAFT[draft.kind]
    const saved = loadPrefs().kind
    return saved && QUICK_KINDS.includes(saved) ? saved : 'Payment'
  })
  const offline = useOffline()

  function choose(option: QuickKind) {
    setKind(option)
    savePrefs({ kind: option })
  }

  return (
    <Modal open title="Quick add" onClose={onClose}>
      {offline && (
        <p className="form-warning quick-offline" role="status">
          You&apos;re offline - saves wait on this phone and sync when you reconnect.
        </p>
      )}
      <div className="day-chips quick-kinds" role="group" aria-label="What to add">
        {QUICK_KINDS.map((option) => (
          <button
            key={option}
            type="button"
            className={`chip${kind === option ? ' is-on' : ''}`}
            aria-pressed={kind === option}
            onClick={() => choose(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {kind === 'Payment' && <PaymentForm onDone={onClose} draft={draft?.kind === 'payment' ? draft : undefined} />}
      {kind === 'Expense' && <ExpenseForm onDone={onClose} draft={draft?.kind === 'expense' ? draft : undefined} />}
      {kind === 'Reminder' && <ReminderForm onDone={onClose} draft={draft?.kind === 'reminder' ? draft : undefined} />}
    </Modal>
  )
}