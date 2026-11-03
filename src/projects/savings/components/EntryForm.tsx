import { useState, type FormEvent } from 'react'
import { useCurrency } from '../../../currency/useCurrency'
import { todayIso } from '../../../lib/format'
import type { EntryInput, EntryKind } from '../model'

interface Props {
  saved: number
  onSave: (input: EntryInput) => Promise<void>
  onCancel: () => void
}

/** Add money to a goal, or take some out. */
export function EntryForm({ saved, onSave, onCancel }: Props) {
  const { money } = useCurrency()
  const [kind, setKind] = useState<EntryKind>('deposit')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({ kind, amount: Number(amount), date, note })
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form className="grid-form" onSubmit={handleSubmit}>
      <div className="span-all day-chips" role="group" aria-label="Deposit or withdraw">
        {(['deposit', 'withdraw'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`chip${kind === option ? ' is-on' : ''}`}
            aria-pressed={kind === option}
            onClick={() => setKind(option)}
            disabled={option === 'withdraw' && saved <= 0}
          >
            {option === 'deposit' ? '+ Deposit' : '\u2212 Withdraw'}
          </button>
        ))}
      </div>
      <label>
        Amount
        <input
          type="number"
          required
          min="0.01"
          step="0.01"
          inputMode="decimal"
          max={kind === 'withdraw' ? saved : undefined}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </label>
      <label>
        Date
        <input type="date" required max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="span-all">
        Note <span className="muted small">(optional)</span>
        <input type="text" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {kind === 'withdraw' && <p className="muted small span-all">Available: {money(saved)}</p>}
      {error && (
        <p className="form-error span-all" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions span-all">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving\u2026' : kind === 'deposit' ? 'Add deposit' : 'Withdraw'}
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}