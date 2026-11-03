import { TrashIcon } from '../../../components/icons'
import { useCurrency } from '../../../currency/useCurrency'
import { shortDate } from '../../../lib/format'
import type { SavingsEntry, SavingsGoal } from '../model'
import { SavingsChart } from './SavingsChart'

interface Props {
  goal: SavingsGoal
  busyId: string | null
  onDeleteEntry: (entry: SavingsEntry) => void
}

/** The chart plus every deposit and withdrawal, newest first. */
export function GoalHistory({ goal, busyId, onDeleteEntry }: Props) {
  const { money } = useCurrency()

  return (
    <div className="sav-history">
      <SavingsChart entries={goal.entries} target={goal.target} />
      {goal.entries.length === 0 ? (
        <p className="muted">No deposits yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Note</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {goal.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{shortDate(entry.date)}</td>
                  <td className={entry.amount < 0 ? 'tone-text-danger' : 'tone-text-ok'}>
                    {entry.amount < 0 ? '\u2212' : '+'}
                    {money(Math.abs(entry.amount))}
                  </td>
                  <td className="sav-note">{entry.note}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-btn"
                      disabled={busyId === entry.id}
                      onClick={() => onDeleteEntry(entry)}
                      aria-label={`Delete entry from ${shortDate(entry.date)}`}
                      title="Delete"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}