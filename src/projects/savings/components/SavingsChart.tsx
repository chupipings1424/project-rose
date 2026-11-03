import { useMemo } from 'react'
import { useCurrency } from '../../../currency/useCurrency'
import { chartGeometry } from '../lib/chart'
import { runningTotals } from '../lib/summary'
import type { SavingsEntry } from '../model'

const WIDTH = 600
const HEIGHT = 180

/** The balance over time as a hand-made SVG step chart, with the target as a dashed line. */
export function SavingsChart({ entries, target }: { entries: SavingsEntry[]; target: number }) {
  const { compactMoney } = useCurrency()
  const points = useMemo(() => runningTotals(entries), [entries])
  const g = useMemo(() => chartGeometry(points, target, WIDTH, HEIGHT), [points, target])

  if (points.length === 0) return <p className="muted small">The chart appears after your first deposit.</p>

  const last = points[points.length - 1]
  return (
    <figure className="sav-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Balance grew to ${compactMoney(last.total)} of ${compactMoney(target)}`}
      >
        <path className="sav-chart-area" d={g.area} />
        <line className="sav-chart-target" x1={0} x2={WIDTH} y1={g.targetY} y2={g.targetY} />
        <path className="sav-chart-line" d={g.line} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="sav-chart-legend muted small">
        <span>{points[0].date}</span>
        <span>Target {compactMoney(target)}</span>
        <span>{last.date}</span>
      </figcaption>
    </figure>
  )
}