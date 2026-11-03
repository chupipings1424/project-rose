import { useState, type FormEvent } from 'react'
import type { GoalInput } from '../model'

interface Props {
  initial?: GoalInput
  submitLabel: string
  onSave: (input: GoalInput) => Promise<void>
  onCancel?: () => void
}

/** Used both for "New goal" and inside the edit dialog. */
export function GoalForm({ initial, submitLabel, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '')
  // Number inputs hand back text; keep it as text until submit so "" stays "" while typing.
  const [target, setTarget] = useState(initial ? String(initial.target) : '')
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({ name, icon, target: Number(target), deadline: deadline || null })
      if (!initial) {
        setName('')
        setIcon('')
        setTarget('')
        setDeadline('')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="grid-form" onSubmit={handleSubmit}>
      <label className="span-all">
        Saving for
        <input
          type="text"
          required
          maxLength={60}
          placeholder="e.g. New laptop"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Target amount
        <input
          type="number"
          required
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </label>
      <label>
        Deadline <span className="muted small">(optional)</span>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </label>
      <label>
        Icon <span className="muted small">(optional emoji)</span>
        <input type="text" maxLength={8} placeholder="e.g. a plane" value={icon} onChange={(e) => setIcon(e.target.value)} />
      </label>
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