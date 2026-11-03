import { memo, useMemo } from 'react'
import { shortDate } from '../../../lib/format'
import { heatmapWeeks, intensity } from '../lib/days'
import { HEATMAP_WEEKS, type Habit } from '../model'

interface Props {
  habit: Habit
  today: string
}

/**
 * The last 12 weeks as a CSS grid: one column per week, one row per weekday. Plain
 * <span>s and CSS - no chart library. memo() skips re-rendering when the props are the same.
 */
export const Heatmap = memo(function Heatmap({ habit, today }: Props) {
  const weeks = useMemo(() => heatmapWeeks(today, HEATMAP_WEEKS), [today])
  const cells = weeks.flat()
  const done = cells.filter((c) => !c.future && (habit.log[c.date] ?? 0) >= habit.target).length
  const days = cells.filter((c) => !c.future).length

  return (
    <div className="hab-heat-wrap">
      <div className="hab-heatmap" role="img" aria-label={`Last ${HEATMAP_WEEKS} weeks: done on ${done} of ${days} days`}>
        {cells.map((cell) => {
          const value = habit.log[cell.date] ?? 0
          const level = cell.future ? 'future' : intensity(value, habit.target)
          return <span key={cell.date} className={`hab-cell lvl-${level}`} title={cell.future ? undefined : `${shortDate(cell.date)}: ${value}`} />
        })}
      </div>
      <p className="muted small hab-heat-caption">
        {done} / {days} days in the last {HEATMAP_WEEKS} weeks
      </p>
    </div>
  )
})