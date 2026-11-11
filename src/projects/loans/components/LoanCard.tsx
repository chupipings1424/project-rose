import { ProgressBar } from '../../../components/ProgressBar'
import { TrashIcon } from '../../../components/icons'
import { useCurrency } from '../../../currency/useCurrency'
import { shortDate } from '../../../lib/format'
import { STATUS_LABELS, type Loan } from '../model'

const STATUS_BADGE: Record<Loan['status'], string> = {
  'not-started': '',
  active: 'badge-due',
  completed: 'badge-clear',
}

interface Props {
  loan: Loan
  onSchedule: () => void
  onEdit: () => void
  onDelete: () => void
}

export function LoanCard({ loan, onSchedule, onEdit, onDelete }: Props) {
  const { money } = useCurrency()
  const done = loan.status === 'completed'

  return (
    <article className={`card loan-card is-${loan.status}`} aria-label={loan.name}>
      <header className="loan-head">
        <h3 className="loan-name">{loan.name}</h3>
        <span className="badge">{loan.type}</span>
        <span className={`badge ${STATUS_BADGE[loan.status]}`}>{STATUS_LABELS[loan.status]}</span>
      </header>

      <p className="loan-amounts">
        <strong>{money(loan.balance)}</strong>
        <span className="muted"> left of {money(loan.totalPayable)}</span>
      </p>
      <ProgressBar value={loan.percent} label={`${loan.name} paid`} />
      <p className="muted small loan-facts">
        <span>
          {loan.paymentsMade} of {loan.term} paid
        </span>
        <span>{money(loan.monthlyAmortization)} a month</span>
        <span>{money(loan.paid)} paid</span>
      </p>

      <dl className="loan-dates small">
        <div>
          <dt>Loan date</dt>
          <dd>{shortDate(loan.loanDate)}</dd>
        </div>
        <div>
          <dt>{done ? 'Last payment' : 'Next due'}</dt>
          <dd>{shortDate(done ? loan.lastPaymentDate : loan.nextDueDate)}</dd>
        </div>
        <div>
          <dt>{done ? 'Finished' : 'Expected finish'}</dt>
          <dd>{shortDate(loan.finishDate)}</dd>
        </div>
      </dl>

      <div className="loan-actions">
        <button type="button" className="btn ghost" onClick={onSchedule}>
          Schedule
        </button>
        <span className="loan-spacer" />
        <button type="button" className="icon-btn" onClick={onEdit} aria-label={`Edit ${loan.name}`} title="Edit">
          {'\u270E'}
        </button>
        <button type="button" className="icon-btn" onClick={onDelete} aria-label={`Delete ${loan.name}`} title="Delete">
          <TrashIcon size={16} />
        </button>
      </div>
    </article>
  )
}
