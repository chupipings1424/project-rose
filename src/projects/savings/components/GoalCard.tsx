import { ProgressBar } from '../../../components/ProgressBar'
import { TrashIcon } from '../../../components/icons'
import { useCurrency } from '../../../currency/useCurrency'
import { shortDate } from '../../../lib/format'
import { STATUS_LABELS, type SavingsGoal } from '../model'

const STATUS_BADGE: Record<SavingsGoal['status'], string> = {
  'on-track': 'badge-clear',
  behind: 'badge-due',
  overdue: 'badge-overdue',
  'no-deadline': '',
  done: 'badge-clear',
}

interface Props {
  goal: SavingsGoal
  onAdd: () => void
  onHistory: () => void
  onEdit: () => void
  onDelete: () => void
}

export function GoalCard({ goal, onAdd, onHistory, onEdit, onDelete }: Props) {
  const { money } = useCurrency()

  return (
    <article className={`card sav-goal is-${goal.status}`} aria-label={goal.name}>
      <header className="sav-goal-head">
        <span className="sav-icon" aria-hidden="true">
          {goal.icon || '\u25C8'}
        </span>
        <h3 className="sav-name">{goal.name}</h3>
        <span className={`badge ${STATUS_BADGE[goal.status]}`}>{STATUS_LABELS[goal.status]}</span>
      </header>

      <p className="sav-amounts">
        <strong>{money(goal.saved)}</strong>
        <span className="muted"> of {money(goal.target)}</span>
      </p>
      <ProgressBar value={goal.percent} label={`${goal.name} progress`} />
      <p className="muted small sav-facts">
        <span>{goal.percent.toFixed(0)}%</span>
        {goal.status !== 'done' && <span>{money(goal.remaining)} to go</span>}
        {goal.deadline && <span>by {shortDate(goal.deadline)}</span>}
      </p>

      {goal.status !== 'done' && (
        <ul className="sav-plan small">
          {goal.monthlyNeeded !== null && (
            <li>
              Save <strong>{money(goal.monthlyNeeded)}</strong> a month to make the deadline
            </li>
          )}
          <li>
            {goal.estimatedFinish
              ? `At your recent pace: reached ${shortDate(goal.estimatedFinish)}`
              : 'No recent deposits - add one to see a forecast'}
          </li>
        </ul>
      )}

      <div className="sav-actions">
        <button type="button" className="btn primary" onClick={onAdd}>
          + Add money
        </button>
        <button type="button" className="btn ghost" onClick={onHistory}>
          History
        </button>
        <span className="sav-spacer" />
        <button type="button" className="icon-btn" onClick={onEdit} aria-label={`Edit ${goal.name}`} title="Edit">
          {'\u270E'}
        </button>
        <button type="button" className="icon-btn" onClick={onDelete} aria-label={`Delete ${goal.name}`} title="Delete">
          <TrashIcon size={16} />
        </button>
      </div>
    </article>
  )
}