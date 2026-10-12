import { useEffect, useState, type FormEvent } from 'react'
import { useToast } from '../../../components/toast/useToast'
import { nowTime, todayIso } from '../../../lib/format'
import { trackerApi } from '../api/client'
import type { PaymentStatus, Summary } from '../api/types'

interface Props {
  summary: Summary
  onSaved: (summary: Summary) => void
}

export function PaymentForm({ summary, onSaved }: Props) {
  const notify = useToast()
  const [amount, setAmount] = useState(summary.has_plan ? String(summary.per_payment) : '')
  const [date, setDate] = useState(todayIso())
  const [time, setTime] = useState(nowTime())
  const [status, setStatus] = useState<PaymentStatus>('Paid')
  const [dueDate, setDueDate] = useState(summary.next_due_date || '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Pre-fill date & time from the server clock (same as the original app).
  async function fillNow() {
    try {
      const now = await trackerApi.now()
      setDate(now.date)
      setTime(now.time)
    } catch {
      setDate(todayIso())
      setTime(nowTime())
    }
  }

  // State already starts at the local time; this swaps in the server clock once it answers.
  useEffect(() => {
    let cancelled = false
    trackerApi.now().then(
      (now) => {
        if (cancelled) return
        setDate(now.date)
        setTime(now.time)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await trackerApi.addPayment({
        title: summary.title,
        amount,
        date,
        time,
        status,
        due_date: dueDate,
        note,
      })
      onSaved(result.summary)
      setAmount(result.summary.has_plan ? String(result.summary.per_payment) : '')
      setStatus('Paid')
      setNote('')
      setDueDate(result.summary.next_due_date || '')
      await fillNow()
      notify('Payment saved to payments.xlsx', 'success')
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card">
      <h3 className="section-title">New payment</h3>
      <form className="grid-form" onSubmit={handleSubmit}>
        <label>
          Amount
          <input type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </label>
        <label>
          Date
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Time
          <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
            <option>Paid</option>
            <option>Unpaid</option>
          </select>
        </label>
        <label>
          Due date
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="span-all">
          Note
          <input type="text" placeholder="e.g. Instalment 7" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="form-actions span-all">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save payment'}
          </button>
          <button type="button" className="btn ghost" onClick={() => void fillNow()}>
            Reset to now
          </button>
          <span className="muted small">Date &amp; time are pre-filled with the current date and time.</span>
        </div>
      </form>
    </section>
  )
}