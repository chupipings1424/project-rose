import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../../components/Modal'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useCurrency } from '../../../currency/useCurrency'
import { shortDate, todayIso } from '../../../lib/format'
import { trackerApi } from '../api/client'
import { FREQUENCIES, type AmountMode, type SchedulePayload, type SchedulePreview } from '../api/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (title: string) => void
}

export function NewTitleDialog({ open, onClose, onCreated }: Props) {
  return (
    <Modal open={open} title="New title" onClose={onClose}>
      <NewTitleForm onCancel={onClose} onCreated={onCreated} />
    </Modal>
  )
}

function NewTitleForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (title: string) => void }) {
  const { money } = useCurrency()
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<AmountMode>('total')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('Monthly')
  const [instalments, setInstalments] = useState('12')
  const [startDate, setStartDate] = useState(todayIso())
  const [notes, setNotes] = useState('')
  // Keep the raw server answer (or an error message) and format it during render,
  // so the text follows the selected currency.
  const [preview, setPreview] = useState<SchedulePreview | string>('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const plan: SchedulePayload = { amount, instalments, frequency, start_date: startDate, amount_mode: mode }
  // Derived during render - no state or effect needed for this.
  const needsInput = !amount || !instalments

  // Objects are new on every render, so debounce a string "key" instead.
  const planKey = useDebouncedValue(JSON.stringify(plan), 250)

  useEffect(() => {
    trackerApi.now().then((now) => setStartDate(now.date), () => undefined)
  }, [])

  // Live, server-computed preview of the schedule.
  useEffect(() => {
    const payload = JSON.parse(planKey) as SchedulePayload
    if (!payload.amount || !payload.instalments) return
    let cancelled = false
    trackerApi.previewSchedule(payload).then(
      (p) => !cancelled && setPreview(p),
      (err: Error) => !cancelled && setPreview(err.message),
    )
    return () => {
      cancelled = true
    }
  }, [planKey])

  function describePlan(p: SchedulePreview | string): string {
    if (typeof p === 'string') return p
    const tail = p.final_payment !== p.per_payment ? ` (final payment ${money(p.final_payment)})` : ''
    return (
      `${p.instalments} ${p.frequency.toLowerCase()} payments of ${money(p.per_payment)}${tail} — ` +
      `total ${money(p.total)}, first due ${shortDate(p.first_due)}, final due ${shortDate(p.final_due)}.`
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await trackerApi.createAccount({ title: title.trim(), notes, ...plan })
      onCreated(title.trim())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Title
        <input type="text" required placeholder="Car Loan" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <label>
        Amount mode
        <select value={mode} onChange={(e) => setMode(e.target.value as AmountMode)}>
          <option value="total">Total amount (split across payments)</option>
          <option value="per_payment">Amount per payment (multiply)</option>
        </select>
      </label>
      <label>
        {mode === 'per_payment' ? 'Amount per payment' : 'Total amount'}
        <input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <div className="two-col">
        <label>
          Frequency
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label>
          Number of payments
          <input type="number" step="1" min="1" required value={instalments} onChange={(e) => setInstalments(e.target.value)} />
        </label>
      </div>
      <label>
        Start date (first instalment)
        <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>
      <label>
        Notes
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <p className="plan-preview">
        {needsInput ? 'Enter an amount and a number of payments to see the plan.' : describePlan(preview) || 'Calculating…'}
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create'}
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}