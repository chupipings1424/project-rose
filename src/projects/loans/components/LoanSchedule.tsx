import { useCurrency } from '../../../currency/useCurrency'
import { shortDate } from '../../../lib/format'
import type { Loan } from '../model'

/** Every monthly payment: the ones whose date has arrived are Paid, the rest Upcoming. */
export function LoanSchedule({ loan }: { loan: Loan }) {
  const { money } = useCurrency()
  const next = loan.status === 'completed' ? null : loan.paymentsMade + 1

  return (
    <div className="table-wrap">
      <table className="loan-schedule" aria-label={`${loan.name} schedule`}>
        <thead>
          <tr>
            <th>#</th>
            <th>Due date</th>
            <th>Amount</th>
            <th>Balance after</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loan.schedule.map((row) => (
            <tr key={row.number} className={row.number === next ? 'is-next' : undefined}>
              <td>{row.number}</td>
              <td>{shortDate(row.dueDate)}</td>
              <td>{money(row.amount)}</td>
              <td>{money(row.balanceAfter)}</td>
              <td className={row.paid ? 'tone-text-ok' : 'muted'}>
                {row.paid ? 'Paid' : row.number === next ? 'Next' : 'Upcoming'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
