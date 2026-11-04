import { Link } from 'react-router-dom'
import { ProgressBar } from '../../../components/ProgressBar'
import { StatTile, type Tone } from '../../../components/StatTile'
import { ErrorState, LoadingState } from '../../../components/States'
import { useCurrency } from '../../../currency/useCurrency'
import { shortDate } from '../../../lib/format'
import type { ReportSummary } from '../../workbook/api/types'
import { ActivityChart, ChartCard, RepaymentChart, StatusDonut } from '../../workbook/components/ReportCharts'
import { ReportHead } from '../../workbook/components/ReportHead'
import { useReport } from '../../workbook/useReport'
import { trackerPaths } from '../paths'

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
  ]
}

/** Payments only: the budget has its own report in the Budget project. */
export default function ReportPage() {
  const { money, compactMoney } = useCurrency()
  const { report, setYear } = useReport()

  if (report.loading && !report.data) return <LoadingState label="Crunching the numbers…" />
  if (report.error && !report.data) return <ErrorState error={report.error} onRetry={report.reload} />
  const data = report.data
  if (!data) return null

  return (
    <div className="stack report">
      <ReportHead title="Payments" data={data} onYear={setYear} />

      {data.kpis.accounts === 0 ? (
        <section className="card state-box">
          <strong className="display">Nothing to chart yet</strong>
          <p className="muted">
            This report builds itself from your instalment plans. Add a title and the charts will appear
            here.
          </p>
          <div className="button-row">
            <Link className="btn primary" to={trackerPaths.payments}>
              Open payments
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