import { ProgressBar } from '../../../components/ProgressBar'
import { StatTile } from '../../../components/StatTile'
import { longDate, shortDate } from '../../../lib/format'
import type { Summary } from '../api/types'
import { dueBadge } from '../lib/dueBadge'
import { useCurrency } from '../../../currency/useCurrency'

interface Props {
  summary: Summary
  showTable: boolean
  showForm: boolean
  onToggleTable: () => void
  onToggleForm: () => void
}

export function AccountSummaryCard({ summary: s, showTable, showForm, onToggleTable, onToggleForm }: Props) {
  const { money } = useCurrency()
  const badge = dueBadge(s)

  return (
    <section className="card">
      <div className="summary-head">
        <h2 className="display">{s.title}</h2>
        <span className={`badge badge-${badge.tone}`}>{badge.label}</span>
      </div>
      {s.account?.notes && <p className="muted">{s.account.notes}</p>}

      <div className="stats">
        <StatTile label="Total amount" value={money(s.total_amount)} />
        <StatTile label="Paid so far" value={money(s.total_paid)} tone="ok" />
        <StatTile label="Remaining" value={money(s.remaining)} tone="warn" />
        <StatTile label="Next due date" value={longDate(s.next_due_date)} />
        <StatTile label="Payments" value={`${s.paid_count} paid / ${s.unpaid_count} unpaid`} />
        <StatTile
          label="Last payment"
          value={s.last_payment ? `${money(s.last_payment.amount)} on ${shortDate(s.last_payment.date)}` : '—'}
        />
        {/* Plan tiles only render for accounts that have a repayment plan */}
        {s.has_plan && (
          <>
            <StatTile label="Per payment" value={`${money(s.per_payment)} ${s.frequency.toLowerCase()}`} tone="accent" />
            <StatTile label="Instalments" value={`${s.paid_count} of ${s.instalments} paid`} />
            <StatTile label="Payments left" value={`${s.payments_left} payment(s)`} />
            <StatTile label="Projected payoff" value={longDate(s.projected_payoff_date)} />
          </>
        )}
      </div>

      <ProgressBar value={s.progress} label="Paid progress" />
      <p className="muted small">
        {s.progress}% paid — {money(s.total_paid)} of {money(s.total_amount)}, {money(s.remaining)} remaining across{' '}
        {s.payment_count} recorded payment(s).
      </p>

      <div className="button-row">
        <button type="button" className="btn ghost" onClick={onToggleTable}>
          {showTable ? 'Hide table' : 'View in table'}
        </button>
        <button type="button" className="btn primary" onClick={onToggleForm}>
          {showForm ? 'Close form' : '+ Insert new payment'}
        </button>
      </div>
    </section>
  )
}