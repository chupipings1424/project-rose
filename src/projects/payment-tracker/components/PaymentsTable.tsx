import { useMemo, useState } from 'react'
import { shortDate } from '../../../lib/format'
import type { Payment } from '../api/types'
import { useCurrency } from '../../../currency/useCurrency'

type Filter = 'all' | 'Paid' | 'Unpaid'

interface Props {
  payments: Payment[]
  onToggleStatus: (payment: Payment) => void
  onDelete: (payment: Payment) => void
}

export function PaymentsTable({ payments, onToggleStatus, onDelete }: Props) {
  const { money } = useCurrency()
  const [filter, setFilter] = useState<Filter>('all')

  // useMemo: only re-filter when the inputs change.
  const rows = useMemo(
    () => payments.filter((p) => filter === 'all' || p.status === filter),
    [payments, filter],
  )
  const total = rows.reduce((sum, p) => sum + p.amount, 0)

  return (
    <section className="card">
      <div className="table-head">
        <h3 className="section-title">All payments</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="Paid">Paid only</option>
          <option value="Unpaid">Unpaid only</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th className="num">Amount</th>
              <th>Status</th>
              <th>Due date</th>
              <th>Note</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  No payments for this filter.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                // `key` lets React track each row between renders - always use a stable id.
                <tr key={p.id} className={p.status === 'Paid' ? '' : 'row-unpaid'}>
                  <td>{shortDate(p.date)}</td>
                  <td>{p.time || '—'}</td>
                  <td className="num">{money(p.amount)}</td>
                  <td>
                    <button
                      type="button"
                      className={`pill pill-${p.status.toLowerCase()}`}
                      onClick={() => onToggleStatus(p)}
                      title="Click to flip Paid / Unpaid"
                    >
                      {p.status}
                    </button>
                  </td>
                  <td>{shortDate(p.due_date)}</td>
                  <td>{p.note}</td>
                  <td>
                    <button type="button" className="btn link danger-text" onClick={() => onDelete(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>TOTAL</td>
              <td className="num">{money(total)}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}