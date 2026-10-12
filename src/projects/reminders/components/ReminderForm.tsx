import { useState, type FormEvent } from 'react'
import { REPEAT_RULES, WEEKDAY_NAMES, type RepeatRule, type ReminderInput } from '../../../../shared/reminders'
import { fromLocalInput, nextHour, toLocalInput } from '../lib/time'

const REPEAT_LABELS: Record<RepeatRule, string> = {
  none: 'Once',
  daily: 'Every day',
  weekdays: 'Weekdays (Mon–Fri)',
  weekly: 'Weekly on…',
  monthly: 'Monthly',
}

interface Props {
  initial?: ReminderInput
  submitLabel: string
  onSave: (input: ReminderInput) => Promise<void>
  onCancel?: () => void
}

/** Used both for "New reminder" and inside the edit dialog. */
export function ReminderForm({ initial, submitLabel, onSave, onCancel }: Props) {
  const [text, setText] = useState(initial?.text ?? '')
  const [when, setWhen] = useState(toLocalInput(initial?.dueAt ?? nextHour()))
  const [repeat, setRepeat] = useState<RepeatRule>(initial?.repeat ?? 'none')
  const [weekDays, setWeekDays] = useState<number[]>(initial?.weekDays ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function changeRepeat(next: RepeatRule) {
    setRepeat(next)
    // Picking "weekly" pre-selects the weekday of the chosen date.
    if (next === 'weekly' && weekDays.length === 0 && when) setWeekDays([new Date(when).getDay()])
  }

  function toggleDay(day: number) {
    setWeekDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort()))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (repeat === 'weekly' && weekDays.length === 0) return setError('Pick at least one weekday.')
    setSaving(true)
    try {
      await onSave({ text, dueAt: fromLocalInput(when), repeat, weekDays: repeat === 'weekly' ? weekDays : [] })
      if (!initial) {
        setText('')
        setWhen(toLocalInput(nextHour()))
        setRepeat('none')
        setWeekDays([])
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
        Remind me to…
        <input
          type="text"
          required
          maxLength={200}
          placeholder="e.g. Pay the electric bill"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <label>
        When
        <input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
      <label>
        Repeat
        <select value={repeat} onChange={(e) => changeRepeat(e.target.value as RepeatRule)}>
          {REPEAT_RULES.map((rule) => (
            <option key={rule} value={rule}>
              {REPEAT_LABELS[rule]}
            </option>
          ))}
        </select>
      </label>
      {repeat === 'weekly' && (
        <div className="span-all day-chips" role="group" aria-label="Weekdays">
          {WEEKDAY_NAMES.map((name, day) => (
            <button
              key={name}
              type="button"
              className={`chip${weekDays.includes(day) ? ' is-on' : ''}`}
              aria-pressed={weekDays.includes(day)}
              onClick={() => toggleDay(day)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="form-error span-all" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions span-all">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
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