import type { CSSProperties, ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useCurrency } from '../../../currency/useCurrency'
import { shortDate } from '../../../lib/format'
import type { ReportSummary, TimelinePoint } from '../api/types'

// Colours come from CSS variables, so every chart follows the selected theme.
const PAID = 'var(--c1)'
const DUE = 'var(--c3)'
const OUT = 'var(--c2)'
const NET = 'var(--c4)'
const PALETTE = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)']

const axisTick = { fill: 'var(--muted)', fontSize: 12 }
const tooltipStyle: CSSProperties = {
  background: 'var(--surface-strong)',
  border: '1px solid var(--border-strong)',
  borderRadius: 10,
  color: 'var(--text)',
  boxShadow: 'var(--glow)',
}
export function ChartCard({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <section className={`card chart-card${wide ? ' chart-wide' : ''}`}>
      <header className="chart-head">
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="muted small">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

function StatusDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: TimelinePoint }) {
  if (cx === undefined || cy === undefined || !payload) return null
  return (
    <circle cx={cx} cy={cy} r={3.5} fill={payload.status === 'Paid' ? PAID : DUE} stroke="var(--bg)" strokeWidth={1} />
  )
}

export function RepaymentChart({ data }: { data: ReportSummary }) {
  const { money, compactMoney } = useCurrency()
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data.payments.timeline} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="payoffFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PAID} stopOpacity={0.5} />
            <stop offset="100%" stopColor={PAID} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} minTickGap={40} />
        <YAxis tick={axisTick} tickFormatter={compactMoney} width={70} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(label) => shortDate(String(label))}
          formatter={(value, _name, item) => {
            const p = item.payload as TimelinePoint
            return [`${money(Number(value))} (${p.title}: ${money(p.amount)} ${p.status.toLowerCase()})`, 'Cumulative paid']
          }}
        />
        {data.kpis.tracked_total > 0 && (
          <ReferenceLine
            y={data.kpis.tracked_total}
            stroke={OUT}
            strokeDasharray="6 4"
            label={{ value: 'Plan total', fill: 'var(--muted)', fontSize: 12, position: 'insideTopRight' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="cumulative_paid"
          stroke={PAID}
          strokeWidth={2}
          fill="url(#payoffFill)"
          dot={<StatusDot />}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ActivityChart({ data }: { data: ReportSummary }) {
  const { money, compactMoney } = useCurrency()
  const formatMoney = (value: unknown) => money(Number(value))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data.payments.activity} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={axisTick} />
        <YAxis tick={axisTick} tickFormatter={compactMoney} width={64} />
        <Tooltip contentStyle={tooltipStyle} formatter={formatMoney} cursor={{ fill: 'var(--grid)' }} />
        <Legend />
        <Bar dataKey="paid" name="Paid" stackId="a" fill={PAID} radius={[0, 0, 0, 0]} />
        <Bar dataKey="scheduled" name="Scheduled" stackId="a" fill={DUE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface Slice {
  name: string
  value: number
  color: string
  note?: string
}

export function Donut({ slices, centreValue, centreLabel }: { slices: Slice[]; centreValue: string; centreLabel: string }) {
  const { money } = useCurrency()
  const formatMoney = (value: unknown) => money(Number(value))
  const visible = slices.filter((s) => s.value > 0.005)
  return (
    <div className="donut-wrap">
      <div className="donut">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={visible} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
              {visible.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={formatMoney} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-centre">
          <strong>{centreValue}</strong>
          <span>{centreLabel}</span>
        </div>
      </div>
      <ul className="legend-list">
        {visible.map((s) => (
          <li key={s.name}>
            <span className="legend-dot" style={{ background: s.color }} />
            <span>{s.note ?? s.name}</span>
            <strong>{money(s.value)}</strong>
          </li>
        ))}
        {visible.length === 0 && <li className="muted">Nothing to show</li>}
      </ul>
    </div>
  )
}

export function StatusDonut({ data }: { data: ReportSummary }) {
  const colors = [PAID, DUE, OUT]
  const split = data.payments.status_split
  const total = split.reduce((sum, s) => sum + s.value, 0)
  return (
    <Donut
      slices={split.map((s, i) => ({
        name: s.label,
        value: s.value,
        color: colors[i % colors.length],
        note: s.count ? `${s.label} (${s.count})` : s.label,
      }))}
      centreValue={total ? `${Math.round((split[0].value / total) * 100)}%` : '—'}
      centreLabel="of plan paid"
    />
  )
}

export function CashFlowChart({ data }: { data: ReportSummary }) {
  const { money, compactMoney } = useCurrency()
  const formatMoney = (value: unknown) => money(Number(value))
  const rows = data.months.map((month, i) => ({
    month,
    revenue: data.budget.revenue_monthly[i] ?? 0,
    expenses: data.budget.expense_monthly[i] ?? 0,
    net: data.budget.cumulative_net[i] ?? 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={rows} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={axisTick} />
        <YAxis tick={axisTick} tickFormatter={compactMoney} width={70} />
        <Tooltip contentStyle={tooltipStyle} formatter={formatMoney} cursor={{ fill: 'var(--grid)' }} />
        <Legend />
        <ReferenceLine y={0} stroke="var(--border-strong)" />
        <Bar dataKey="revenue" name="Revenue" fill={PAID} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill={OUT} radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="net" name="Running net" stroke={NET} strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function ExpenseMix({ data }: { data: ReportSummary }) {
  const { compactMoney } = useCurrency()
  const groups = data.budget.expense_groups
  const total = groups.reduce((sum, g) => sum + g.total, 0)
  return (
    <Donut
      slices={groups.map((g, i) => ({ name: g.name, value: g.total, color: PALETTE[i % PALETTE.length] }))}
      centreValue={compactMoney(total)}
      centreLabel="expenses"
    />
  )
}

export function TopItemsChart({ data }: { data: ReportSummary }) {
  const { money, compactMoney } = useCurrency()
  const formatMoney = (value: unknown) => money(Number(value))
  const items = data.budget.top_expense_items
  if (items.length === 0) return <p className="muted">No expense lines for {data.year}.</p>
  return (
    <ResponsiveContainer width="100%" height={Math.max(items.length * 38, 120)}>
      <BarChart data={items} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={axisTick} tickFormatter={compactMoney} />
        <YAxis type="category" dataKey="item" tick={axisTick} width={120} />
        <Tooltip contentStyle={tooltipStyle} formatter={formatMoney} cursor={{ fill: 'var(--grid)' }} />
        <Bar dataKey="total" name="Annual total" radius={[0, 4, 4, 0]}>
          {items.map((item, i) => (
            <Cell key={`${item.group}-${item.item}`} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}