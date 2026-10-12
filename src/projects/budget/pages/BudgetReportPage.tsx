import { Link } from 'react-router-dom'
import { StatTile, type Tone } from '../../../components/StatTile'
import { ErrorState, LoadingState } from '../../../components/States'
import { useCurrency } from '../../../currency/useCurrency'
import type { ReportSummary } from '../../workbook/api/types'
import { CashFlowChart, ChartCard, ExpenseMix, TopItemsChart } from '../../workbook/components/ReportCharts'
import { ReportHead } from '../../workbook/components/ReportHead'
import { useReport } from '../../workbook/useReport'
import { budgetPaths } from '../paths'

function kpis(data: ReportSummary, compactMoney: (value: number) => string): { label: string; value: string; hint: string; tone: Tone }[] {
  const k = data.kpis
  return [
    { label: 'Revenue', value: compactMoney(k.budget_revenue), hint: 'budgeted income', tone: 'ok' },
    { label: 'Expenses', value: compactMoney(k.budget_expenses), hint: 'budgeted spend', tone: 'warn' },
    {
      label: 'Net',
      value: compactMoney(k.budget_net),
      hint: k.budget_net < 0 ? 'spending exceeds income' : 'income exceeds spending',
      tone: k.budget_net < 0 ? 'danger' : 'ok',
    },
    { label: 'Budget lines', value: String(k.budget_lines), hint: `planned across ${data.year}`, tone: 'default' },
  ]
}

export default function BudgetReportPage() {
  const { compactMoney } = useCurrency()
  const { report, setYear } = useReport()

  if (report.loading && !report.data) return <LoadingState label="Crunching the numbers…" />
  if (report.error && !report.data) return <ErrorState error={report.error} onRetry={report.reload} />
  const data = report.data
  if (!data) return null

  return (
    <div className="stack report">
      <ReportHead title="Budget" data={data} onYear={setYear} />

      {data.kpis.budget_lines === 0 ? (
        <section className="card state-box">
          <strong className="display">Nothing to chart yet</strong>
          <p className="muted">
            This report builds itself from the budget lines for {data.year}. Add a revenue or expense line and the charts
            will appear here.
          </p>
          <div className="button-row">
            <Link className="btn primary" to={budgetPaths.budget}>
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

          <ChartCard
            title="Cash flow"
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
        </>
      )}
    </div>
  )
}