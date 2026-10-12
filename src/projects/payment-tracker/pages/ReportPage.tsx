import { Link, useSearchParams } from 'react-router-dom'
import { ProgressBar } from '../../../components/ProgressBar'
import { StatTile, type Tone } from '../../../components/StatTile'
import { ErrorState, LoadingState } from '../../../components/States'
import { useCurrency } from '../../../currency/useCurrency'
import { useAsync } from '../../../hooks/useAsync'
import { shortDate } from '../../../lib/format'
import { trackerApi } from '../api/client'
import type { ReportSummary } from '../api/types'
import { trackerPaths } from '../paths'
import {
  ActivityChart,
  CashFlowChart,
  ChartCard,
  ExpenseMix,
  RepaymentChart,
  StatusDonut,
  TopItemsChart,
} from '../components/ReportCharts'

function daysLabel(days: number | null): string {
  if (days === null) return 'nothing scheduled'
  if (days === 0) return 'due today'
  if (days < 0) return `${Math.abs(days)} day(s) overdue`
  return `in ${days} day(s)`
}

function kpis(data: ReportSummary, compactMoney: (value: number) => string): { label: string; value: string; hint: string; tone: Tone }[] {
  const k = data.kpis
  return [
    { label: 'Tracked total', value: compactMoney(k.tracked_total), hint: `${k.accounts} title(s)`, tone: 'accent' },
    { label: 'Paid so far', value: compactMoney(k.paid_total), hint: `${k.progress}% of plan · ${k.paid_count} payments`, tone: 'ok' },
    { label: 'Outstanding', value: compactMoney(k.outstanding), hint: `${k.unpaid_count} unpaid instalment(s)`, tone: 'warn' },
    {
      label: 'Overdue',
      value: compactMoney(k.overdue_total),
      hint: `${k.overdue_count} instalment(s)`,
      tone: k.overdue_count ? 'danger' : 'ok',
    },
    { label: 'Next due', value: k.next_due ? shortDate(k.next_due) : '—', hint: daysLabel(k.days_until_due), tone: 'default' },
    { label: `Revenue ${data.year}`, value: compactMoney(k.budget_revenue), hint: 'budgeted income', tone: 'ok' },
    { label: `Expenses ${data.year}`, value: compactMoney(k.budget_expenses), hint: 'budgeted spend', tone: 'warn' },
    {
      label: `Net ${data.year}`,
      value: compactMoney(k.budget_net),
      hint: k.budget_net < 0 ? 'spending exceeds income' : 'income exceeds spending',
      tone: k.budget_net < 0 ? 'danger' : 'ok',
    },
    { label: 'Budget lines', value: String(k.budget_lines), hint: `planned across ${data.year}`, tone: 'default' },
  ]
}

export default function ReportPage() {
  const { money, compactMoney } = useCurrency()
  const [params, setParams] = useSearchParams()
  const yearParam = params.get('year')
  const report = useAsync(() => trackerApi.report(yearParam), [yearParam])

  if (report.loading && !report.data) return <LoadingState label="Crunching the numbers…" />
  if (report.error && !report.data) return <ErrorState error={report.error} onRetry={report.reload} />
  const data = report.data
  if (!data) return null

  return (
    <div className="stack report">
      <section className="report-head">
        <div>
          <p className="eyebrow">Financial report</p>
          <h2 className="display">Payments &amp; Budget · {data.year}</h2>
          <p className="muted small">
            Generated {new Date(data.generated_at).toLocaleString()} from <code>{data.workbook}</code>
          </p>
        </div>
        <div className="button-row no-print">
          <label className="inline">
            <span className="field-label">Year</span>
            <select value={data.year} onChange={(e) => setParams({ year: e.target.value })}>
              {(data.years.length ? data.years : [data.year]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn ghost" onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
      </section>

      {!data.has_data ? (
        <section className="card state-box">
          <strong className="display">Nothing to chart yet</strong>
          <p className="muted">
            This report builds itself from the payments and budget lines in your workbook. Add an instalment plan or a
            budget line and the charts will appear here.
          </p>
          <div className="button-row">
            <Link className="btn primary" to={trackerPaths.payments}>
              Open payment tracker
            </Link>
            <Link className="btn ghost" to={trackerPaths.budget}>
              Open budget
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="kpi-grid">
            {kpis(data, compactMoney).map((kpi) => (
              <StatTile key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} tone={kpi.tone} />
            ))}
          </section>

          <ChartCard title="Repayment progress" subtitle="Money actually paid, accumulating over every logged instalment." wide>
            <RepaymentChart data={data} />
          </ChartCard>

          <div className="chart-row">
            <ChartCard title="Payment activity" subtitle={`Paid vs still scheduled, month by month in ${data.year}.`}>
              <ActivityChart data={data} />
            </ChartCard>
            <ChartCard title="Where the plan stands" subtitle="Paid, scheduled and not-yet-scheduled shares of the plan total.">
              <StatusDonut data={data} />
            </ChartCard>
          </div>

          <ChartCard
            title="Budget cash flow"
            subtitle={`Revenue against expenses each month of ${data.year}, with the running net.`}
            wide
          >
            <CashFlowChart data={data} />
          </ChartCard>

          <div className="chart-row">
            <ChartCard title="Expense mix" subtitle="Where the budgeted spend is concentrated.">
              <ExpenseMix data={data} />
            </ChartCard>
            <ChartCard title="Largest line items" subtitle="Top budget entries by annual total.">
              <TopItemsChart data={data} />
            </ChartCard>
          </div>

          <ChartCard title="Progress by title" subtitle="How far each tracked plan has been paid down." wide>
            <ul className="title-progress">
              {data.payments.by_title.map((t) => (
                <li key={t.title}>
                  <div className="title-progress-head">
                    <strong>{t.title}</strong>
                    <span className="muted small">
                      {money(t.paid)} of {money(t.total)} · {t.paid_count}/{t.payment_count} payments
                      {t.frequency ? ` · ${money(t.per_payment)} ${t.frequency.toLowerCase()}` : ''}
                    </span>
                    <span className="title-progress-pct">{t.progress}%</span>
                  </div>
                  <ProgressBar value={t.progress} label={`${t.title} progress`} />
                </li>
              ))}
            </ul>
          </ChartCard>

          <ChartCard title="What is due next" subtitle="The nearest unpaid instalments across every title." wide>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Due</th>
                    <th>In</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.upcoming.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        Nothing scheduled.
                      </td>
                    </tr>
                  ) : (
                    data.payments.upcoming.map((u, i) => (
                      <tr key={`${u.title}-${u.due_date}-${i}`} className={u.days < 0 ? 'row-overdue' : ''}>
                        <td>{u.title}</td>
                        <td>{shortDate(u.due_date)}</td>
                        <td>{daysLabel(u.days)}</td>
                        <td className="num">{money(u.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  )
}