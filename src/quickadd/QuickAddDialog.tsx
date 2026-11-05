import { useState, type FormEvent } from 'react'
import { Modal } from '../components/Modal'
import { useToast } from '../components/toast/useToast'
import { useAsync } from '../hooks/useAsync'
import { announceDataChanged } from '../lib/dataEvents'
import { nowTime, todayIso } from '../lib/format'
import { useOffline, VIEW_ONLY_MESSAGE } from '../lib/offline'
import { remindersApi } from '../projects/reminders/api/client'
import { fromLocalInput, nextHour, toLocalInput } from '../projects/reminders/lib/time'
import { workbookApi } from '../projects/workbook/api/client'
import type { PaymentStatus } from '../projects/workbook/api/types'

const QUICK_KINDS = ['Payment', 'Expense', 'Reminder'] as const
type QuickKind = (typeof QUICK_KINDS)[number]

const NEW_LINE = '__new'

/** Shared by the three forms: save, tell the user, let other pages reload, close. */
function useSaver(onDone: () => void) {
  const notify = useToast()
  const [saving, setSaving] = useState(false)
  async function save(action: () => Promise<unknown>, message: string) {
    setSaving(true)
    try {
      await action()
      notify(message, 'success')
      announceDataChanged()
      onDone()
    } catch (error) {
      notify((error as Error).message, 'error')
      setSaving(false)
    }
  }
  return { saving, save }
}

function PaymentForm({ onDone }: { onDone: () => void }) {
  const accounts = useAsync(() => workbookApi.accounts(), [])
  const [title, setTitle] = useState('')
  const chosen = title || accounts.data?.[0]?.title || ''
  const summary = useAsync(() => (chosen ? workbookApi.summary(chosen) : Promise.resolve(null)), [chosen])
  // null = "not typed yet": show the suggestion from the title's plan.
  const [amount, setAmount] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [status, setStatus] = useState<PaymentStatus>('Paid')
  const [date, setDate] = useState(todayIso())
  const { saving, save } = useSaver(onDone)

  const plan = summary.data
  const amountValue = amount ?? (plan?.has_plan ? String(plan.per_payment) : '')
  const dueValue = dueDate ?? plan?.next_due_date ?? ''

  if (accounts.loading && !accounts.data) return <p className="muted">Loading titles…</p>
  if (accounts.error) return <p className="form-error">{accounts.error.message}</p>
  if (!accounts.data?.length) return <p className="muted">Add a title in the Payment Tracker first.</p>

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save(
      () => workbookApi.addPayment({ title: chosen, amount: amountValue, date, time: nowTime(), status, due_date: dueValue, note: '' }),
      `Payment saved for ${chosen}`,
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
      <button type="submit" className="btn primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save payment'}
      </button>
    </form>
  )
}

function ExpenseForm({ onDone }: { onDone: () => void }) {
  // Captured once, so the month can't change between renders.
  const [now] = useState(() => new Date())
  const year = now.getFullYear()
  const month = now.getMonth()
  const budget = useAsync(() => workbookApi.budget(year), [year])
  const [choice, setChoice] = useState('')
  const [item, setItem] = useState('')
  const [group, setGroup] = useState('')
  const [amount, setAmount] = useState('')
  const { saving, save } = useSaver(onDone)

  if (budget.loading && !budget.data) return <p className="muted">Loading budget…</p>
  if (budget.error || !budget.data) return <p className="form-error">{budget.error?.message}</p>

  const data = budget.data
  const lines = data.sections.filter((s) => s.name === 'Expense').flatMap((s) => s.groups.flatMap((g) => g.lines))
  const selected = choice || lines[0]?.id || NEW_LINE
  const groups = data.known_groups.Expense
  const groupValue = group || groups[0] || 'Other'
  const monthName = data.months[month] ?? ''

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const spent = Number(amount)
    if (!(spent > 0)) return
    void save(async () => {
      let id = selected
      let current = 0
      if (selected === NEW_LINE) {
        id = (await workbookApi.addBudgetLine({ section: 'Expense', group: groupValue, item: item.trim(), notes: '', year })).id
      } else {
        current = lines.find((line) => line.id === selected)?.amounts[month] ?? 0
      }
      const total = Math.round((current + spent) * 100) / 100
      await workbookApi.updateBudgetCell(id, month, String(total), year)
    }, `Added to ${monthName} expenses`)
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
      <button type="submit" className="btn primary" disabled={saving}>
        {saving ? 'Saving…' : 'Add expense'}
      </button>
    </form>
  )
}

function ReminderForm({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('')
  const [when, setWhen] = useState(() => toLocalInput(nextHour()))
  const { saving, save } = useSaver(onDone)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save(() => remindersApi.create({ text: text.trim(), dueAt: fromLocalInput(when), repeat: 'none' }), 'Reminder set')
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
      <button type="submit" className="btn primary" disabled={saving}>
        {saving ? 'Saving…' : 'Set reminder'}
      </button>
    </form>
  )
}

/** The (+) dialog: add a payment, an expense or a reminder from any page. */
export default function QuickAddDialog({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<QuickKind>('Payment')
  const offline = useOffline()

  return (
    <Modal open title="Quick add" onClose={onClose}>
      {offline ? (
        <p className="muted">{VIEW_ONLY_MESSAGE}</p>
      ) : (
        <>
          <div className="day-chips quick-kinds" role="group" aria-label="What to add">
            {QUICK_KINDS.map((option) => (
              <button
                key={option}
                type="button"
                className={`chip${kind === option ? ' is-on' : ''}`}
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
              >
                {option}
              </button>
            ))}
          </div>
          {kind === 'Payment' && <PaymentForm onDone={onClose} />}
          {kind === 'Expense' && <ExpenseForm onDone={onClose} />}
          {kind === 'Reminder' && <ReminderForm onDone={onClose} />}
        </>
      )}
    </Modal>
  )
}