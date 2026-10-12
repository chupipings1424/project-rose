import type { Budget } from '../api/types'
import { useCurrency } from '../../../currency/useCurrency'

export function NetTable({ budget }: { budget: Budget }) {
  const { money } = useCurrency()
  const tone = (value: number) => (value < 0 ? 'tone-text-danger' : 'tone-text-ok')
  return (
    <section className="card budget-section">
      <div className="section-banner">NET (REVENUE − EXPENSES)</div>
      <div className="table-wrap">
        <table className="budget-table">
          <tbody>
            <tr className="group-row">
              <th>MONTH</th>
              {budget.months.map((m) => (
                <th key={m} className="num">
                  {m.toUpperCase()}
                </th>
              ))}
              <th className="num">TOTAL</th>
            </tr>
            <tr className="subtotal-row">
              <td>Net</td>
              {budget.net_by_month.map((value, i) => (
                <td key={i} className={`num ${tone(value)}`}>
                  {money(value)}
                </td>
              ))}
              <td className={`num ${tone(budget.net)}`}>{money(budget.net)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}