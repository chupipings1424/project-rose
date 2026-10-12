import type { Reminder } from '../../../../shared/reminders'
import { describeRepeat } from '../../../../shared/reminders'
import { TrashIcon } from '../../../components/icons'
import { statusOf } from '../lib/status'
import { friendlyTime } from '../lib/time'


const SNOOZE_MINUTES = [5, 10, 30, 60]

interface Props {
  reminder: Reminder
  busy: boolean
  onComplete: () => void
  onDismiss: () => void
  onSnooze: (minutes: number) => void
  onEdit: () => void
  onDelete: () => void
}

export function ReminderRow({ reminder, busy, onComplete, onDismiss, onSnooze, onEdit, onDelete }: Props) {
  const status = statusOf(reminder)
  const repeating = reminder.repeat !== 'none'

  return (
    <li className={`rem-item is-${status}`}>
      <div className="rem-main">
        <strong className="rem-text">{reminder.text}</strong>
        <span className="muted small">
          {status === 'snoozed' && reminder.snoozedUntil
            ? `Snoozed until ${friendlyTime(reminder.snoozedUntil)}`
            : repeating
              ? `Next: ${friendlyTime(reminder.dueAt)}`
              : friendlyTime(reminder.dueAt)}
          {' · '}
          {describeRepeat(reminder)}
        </span>
      </div>

      {status === 'ringing' && <span className="badge badge-overdue">Ringing</span>}
      {status === 'overdue' && <span className="badge badge-due">Missed</span>}

      <div className="rem-actions">
        {(status === 'ringing' || status === 'snoozed') && (
          <label className="rem-snooze">
            <span className="sr-only">Snooze</span>
            <select
              value=""
              disabled={busy}
              onChange={(e) => e.target.value && onSnooze(Number(e.target.value))}
              aria-label={`Snooze ${reminder.text}`}
            >
              <option value="">Snooze…</option>
              {SNOOZE_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : '1 hour'}
                </option>
              ))}
            </select>
          </label>
        )}
        {/* A repeating reminder is never "done": you just silence this round. */}
        {repeating && (status === 'ringing' || status === 'snoozed') && (
          <button type="button" className="btn" disabled={busy} onClick={onDismiss}>
            Got it
          </button>
        )}
        {!repeating && status !== 'done' && (
          <button type="button" className="btn" disabled={busy} onClick={onComplete}>
            ✓ Done
          </button>
        )}
        <button type="button" className="icon-btn" onClick={onEdit} aria-label={`Edit ${reminder.text}`} title="Edit">
          ✎
        </button>
        <button type="button" className="icon-btn" onClick={onDelete} aria-label={`Delete ${reminder.text}`} title="Delete">
          <TrashIcon size={16} />
        </button>
      </div>
    </li>
  )
}