import { useState } from 'react'
import { TrashIcon } from '../../../components/icons'
import { dayLabel, lastDays, weekdayShort } from '../lib/days'
import { EDITABLE_DAYS, type Habit } from '../model'
import { Heatmap } from './Heatmap'

interface Props {
  habit: Habit
  today: string
  onSetDay: (date: string, value: number) => void
  onEdit: () => void
  onDelete: () => void
}

export function HabitCard({ habit, today, onSetDay, onEdit, onDelete }: Props) {
  const days = lastDays(today, EDITABLE_DAYS)
  // Count habits: the +/- buttons change the selected day (today unless you pick another).
  const [selected, setSelected] = useState(today)
  const day = days.includes(selected) ? selected : today
  const value = habit.log[day] ?? 0
  const isCount = habit.kind === 'count'

  function pressDay(date: string) {
    if (isCount) setSelected(date)
    else onSetDay(date, (habit.log[date] ?? 0) >= 1 ? 0 : 1)
  }

  return (
    <article className={`card hab-card${habit.doneToday ? ' is-done' : ''}`} aria-label={habit.name}>
      <header className="hab-head">
        <span className="hab-icon" aria-hidden="true">
          {habit.icon || '\u25CE'}
        </span>
        <div className="hab-title">
          <h3 className="hab-name">{habit.name}</h3>
          <p className="muted small">
            {isCount ? `${habit.target}${habit.unit ? ` ${habit.unit}` : ''} a day` : 'Daily'}
            {habit.remindAt && ` \u00B7 nudge at ${habit.remindAt}`}
          </p>
        </div>
        <span className={`badge${habit.currentStreak > 0 ? ' badge-clear' : ''}`} title={`Best: ${habit.bestStreak} days`}>
          {habit.currentStreak}-day streak
        </span>
      </header>

      <div className="hab-week" role="group" aria-label="Last 7 days">
        {days.map((date) => {
          const amount = habit.log[date] ?? 0
          const done = amount >= habit.target
          const label = isCount
            ? `${dayLabel(date)}: ${amount} of ${habit.target}`
            : `${dayLabel(date)}: ${done ? 'done' : 'not done'}`
          return (
            <button
              key={date}
              type="button"
              className={`hab-day${done ? ' is-done' : amount > 0 ? ' is-partial' : ''}${date === today ? ' is-today' : ''}${isCount && date === day ? ' is-selected' : ''}`}
              aria-pressed={isCount ? date === day : done}
              aria-label={label}
              onClick={() => pressDay(date)}
            >
              <span className="hab-day-name">{date === today ? 'Today' : weekdayShort(date)}</span>
              <span className="hab-day-mark" aria-hidden="true">
                {isCount ? amount : done ? '\u2713' : ''}
              </span>
            </button>
          )
        })}
      </div>

      {isCount && (
        <div className="hab-counter" role="group" aria-label={`Count for ${day === today ? 'today' : dayLabel(day)}`}>
          <button type="button" className="icon-btn" aria-label="Remove one" disabled={value <= 0} onClick={() => onSetDay(day, value - 1)}>
            {'\u2212'}
          </button>
          <span className="hab-count" aria-live="polite">
            <strong>{value}</strong> / {habit.target} {habit.unit}
            <span className="muted small"> {day === today ? 'today' : `on ${dayLabel(day)}`}</span>
          </span>
          <button type="button" className="icon-btn" aria-label="Add one" disabled={value >= 9999} onClick={() => onSetDay(day, value + 1)}>
            +
          </button>
          {value < habit.target && (
            <button type="button" className="btn ghost" onClick={() => onSetDay(day, habit.target)}>
              Fill
            </button>
          )}
        </div>
      )}

      <Heatmap habit={habit} today={today} />

      <div className="hab-actions">
        <span className="muted small">Best streak: {habit.bestStreak} days</span>
        <span className="hab-spacer" />
        <button type="button" className="icon-btn" onClick={onEdit} aria-label={`Edit ${habit.name}`} title="Edit">
          {'\u270E'}
        </button>
        <button type="button" className="icon-btn" onClick={onDelete} aria-label={`Delete ${habit.name}`} title="Delete">
          <TrashIcon size={16} />
        </button>
      </div>
    </article>
  )
}