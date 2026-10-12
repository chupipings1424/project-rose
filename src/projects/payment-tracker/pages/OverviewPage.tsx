import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../../components/States'
import { useAsync } from '../../../hooks/useAsync'
import { trackerApi } from '../api/client'
import { trackerPaths } from '../paths'
import { useCurrency } from '../../../currency/useCurrency'

export default function OverviewPage() {
  const { compactMoney } = useCurrency()
  const stats = useAsync(() => trackerApi.homeStats(), [])

  if (stats.loading && !stats.data) return <LoadingState />
  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.reload} />
  const data = stats.data
  if (!data) return null
  const netTone = data.budget.net < 0 ? 'danger' : 'ok'

  return (
    <>
      <div className="entry-grid">
        <Link to={trackerPaths.payments} className="card entry-card">
          <span className="entry-icon">◉</span>
          <h2>Payments</h2>
          <p className="muted">Track instalment plans and loans. Log each payment, watch the balance fall and see what is due next.</p>
          <div className="entry-stats">
            <div>
              <strong>{data.payments.accounts}</strong>
              <span>Titles</span>
            </div>
            <div>
              <strong>{compactMoney(data.payments.total)}</strong>
              <span>Tracked</span>
            </div>
            <div>
              <strong>{data.payments.next_due ?? 'None'}</strong>
              <span>Next due</span>
            </div>
          </div>
          <span className="entry-go">Open tracker →</span>
        </Link>

        <Link to={trackerPaths.budget} className="card entry-card">
          <span className="entry-icon">▣</span>
          <h2>Personal Budget</h2>
          <p className="muted">Plan a full year month by month. Revenue and expenses grouped into sections with running totals.</p>
          <div className="entry-stats">
            <div>
              <strong>{compactMoney(data.budget.revenue)}</strong>
              <span>Revenue</span>
            </div>
            <div>
              <strong>{compactMoney(data.budget.expenses)}</strong>
              <span>Expenses</span>
            </div>
            <div>
              <strong className={`tone-text-${netTone}`}>{compactMoney(data.budget.net)}</strong>
              <span>Net {data.budget.year}</span>
            </div>
          </div>
          <span className="entry-go">Open budget →</span>
        </Link>

        <Link to={trackerPaths.report} className="card entry-card entry-wide">
          <span className="entry-icon">▲</span>
          <div>
            <h2>Report &amp; Charts</h2>
            <p className="muted">
              Turn both sheets into a visual, print-ready report — repayment progress, monthly cash flow and where the
              money goes.
            </p>
          </div>
          <span className="entry-go">View report →</span>
        </Link>
      </div>
      <p className="workbook-path">
        Saving to <code>{data.workbook}</code>
      </p>
    </>
  )
}