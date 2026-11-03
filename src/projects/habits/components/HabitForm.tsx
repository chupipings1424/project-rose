import { useState, type FormEvent } from 'react'
import type { HabitInput, HabitKind } from '../model'

interface Props {
  initial?: HabitInput
  submitLabel: string
  onSave: (input: HabitInput) => Promise<void>
  onCancel?: () => void
}

const KINDS: { value: HabitKind; label: string }[] = [
  { value: 'check', label: 'Done / not done' },
  { value: 'count', label: 'Count towards a target' },
]

/** Used both for "New habit" and inside the edit dialog. */
export function HabitForm({ initial, submitLabel, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '')
  const [kind, setKind] = useState<HabitKind>(initial?.kind ?? 'check')
  const [target, setTarget] = useState(initial && initial.kind === 'count' ? String(initial.target) : '')
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [remindAt, setRemindAt] = useState(initial?.remindAt ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const isCount = kind === 'count'
      await onSave({
        name,
        icon,
        kind,
        target: isCount ? Number(target) : 1,
        unit: isCount ? unit : '',
        remindAt: remindAt || null,
      })
      if (!initial) {
        setName('')
        setIcon('')
        setKind('check')
        setTarget('')
        setUnit('')
        setRemindAt('')
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
        Habit
        <input
          type="text"
          required
          maxLength={60}
          placeholder="e.g. Read 20 minutes"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="span-all day-chips" role="group" aria-label="Kind of habit">
        {KINDS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`chip${kind === option.value ? ' is-on' : ''}`}
            aria-pressed={kind === option.value}
            onClick={() => setKind(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {kind === 'count' && (
        <>
          <label>
            Daily target
            <input
              type="number"
              required
              min="1"
              max="9999"
              step="1"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <label>
            Unit <span className="muted small">(optional)</span>
            <input type="text" maxLength={20} placeholder="e.g. glasses" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </label>
        </>
      )}
      <label>
        Nudge me at <span className="muted small">(optional)</span>
        <input type="time" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
      </label>
      <label>
        Icon <span className="muted small">(optional emoji)</span>
        <input type="text" maxLength={8} value={icon} onChange={(e) => setIcon(e.target.value)} />
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