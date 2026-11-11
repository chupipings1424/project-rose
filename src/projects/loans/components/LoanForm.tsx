import { useState, type FormEvent } from 'react'
import { useCurrency } from '../../../currency/useCurrency'
import { LOAN_TYPES, type LoanInput } from '../model'

interface Props {
  initial?: LoanInput
  submitLabel: string
  onSave: (input: LoanInput) => Promise<void>
  onCancel?: () => void
}

/** Used both for "New loan" and inside the edit dialog. */
export function LoanForm({ initial, submitLabel, onSave, onCancel }: Props) {
  const { money } = useCurrency()
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? LOAN_TYPES[0])
  const [loanDate, setLoanDate] = useState(initial?.loanDate ?? '')
  // Number inputs hand back text; keep it as text until submit so "" stays "" while typing.
  const [term, setTerm] = useState(initial ? String(initial.term) : '')
  const [monthly, setMonthly] = useState(initial ? String(initial.monthlyAmortization) : '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // A live preview, derived from what is typed (no extra state needed).
  const total = Number(monthly) * Number(term)
  const interest = total - Number(amount)
  const day = loanDate ? Number(loanDate.slice(8, 10)) : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({
        name,
        type,
        loanDate,
        term: Number(term),
        monthlyAmortization: Number(monthly),
        amount: Number(amount),
      })
      if (!initial) {
        setName('')
        setLoanDate('')
        setTerm('')
        setMonthly('')
        setAmount('')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="grid-form" onSubmit={handleSubmit}>
      <label>
        Loan name
        <input
          type="text"
          required
          maxLength={60}
          placeholder="e.g. Coop salary loan"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Type
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {LOAN_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Loan date
        <input type="date" required value={loanDate} onChange={(e) => setLoanDate(e.target.value)} />
      </label>
      <label>
        Term (months)
        <input
          type="number"
          required
          min="1"
          max="600"
          step="1"
          inputMode="numeric"
          placeholder="e.g. 24"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </label>
      <label>
        Monthly amortization
        <input
          type="number"
          required
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
        />
      </label>
      <label>
        Loan amount
        <input
          type="number"
          required
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      {total > 0 && (
        <p className="muted small span-all loan-preview">
          Total to pay <strong>{money(total)}</strong>
          {Number(amount) > 0 && interest > 0 && <> {'\u00B7'} interest {money(interest)}</>}
          {day !== null && <> {'\u00B7'} paid every {day}{ordinal(day)} of the month</>}
        </p>
      )}
      {error && (
        <p className="form-error span-all" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions span-all">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving\u2026' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'
}
