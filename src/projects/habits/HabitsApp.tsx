import { useEffect, useMemo, useReducer, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { StatTile } from '../../components/StatTile'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { useToast } from '../../components/toast/useToast'
import { todayIso } from '../../lib/format'
import { REMINDERS_BASE } from '../reminders/paths'
import { habitsApi } from './api/client'
import { HabitCard } from './components/HabitCard'
import { HabitForm } from './components/HabitForm'
import { habitsReducer, initialHabitsState } from './lib/reducer'
import type { Habit, HabitInput } from './model'
import './habits.css'

export default function HabitsApp() {
  const notify = useToast()
  const [state, dispatch] = useReducer(habitsReducer, initialHabitsState)
  const [version, setVersion] = useState(0)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [deleting, setDeleting] = useState<Habit | null>(null)
  const { habits, error } = state
  const today = todayIso()

  useEffect(() => {
    let cancelled = false
    habitsApi.list().then(
      (list) => !cancelled && dispatch({ type: 'loaded', habits: list }),
      (err: unknown) => !cancelled && dispatch({ type: 'failed', error: err instanceof Error ? err : new Error(String(err)) }),
    )
    return () => {
      cancelled = true
    }
  }, [version])

  const stats = useMemo(() => {
    const list = habits ?? []
    const longest = list.reduce<Habit | null>((best, h) => (h.currentStreak > (best?.currentStreak ?? 0) ? h : best), null)
    return {
      doneToday: list.filter((h) => h.doneToday).length,
      total: list.length,
      longest,
      bestEver: Math.max(0, ...list.map((h) => h.bestStreak)),
    }
  }, [habits])

  /** Optimistic: the tick shows at once; if the API says no, it is rolled back. */
  async function setDay(habit: Habit, date: string, value: number) {
    const previous = habit.log[date] ?? 0
    if (value === previous) return
    dispatch({ type: 'dayChanged', id: habit.id, date, value, today })
    try {
      const saved = await habitsApi.setDay(habit.id, date, value)
      dispatch({ type: 'dayConfirmed', habit: saved })
      if (date === today && saved.doneToday && previous < habit.target) notify(`${habit.name}: done for today!`, 'success')
    } catch (err) {
      dispatch({ type: 'dayFailed', id: habit.id, date, previous, today })
      notify((err as Error).message, 'error')
    }
  }

  async function create(input: HabitInput) {
    dispatch({ type: 'added', habit: await habitsApi.create(input) })
    notify('Habit added', 'success')
  }

  async function saveEdit(input: HabitInput) {
    if (!editing) return
    dispatch({ type: 'replaced', habit: await habitsApi.update(editing.id, input) })
    setEditing(null)
    notify('Habit updated', 'success')
  }

  async function confirmDelete() {
    if (!deleting) return
    const target = deleting
    setDeleting(null)
    try {
      await habitsApi.remove(target.id)
      dispatch({ type: 'removed', id: target.id })
      notify('Habit deleted', 'success')
    } catch (err) {
      notify((err as Error).message, 'error')
    }
  }

  return (
    <div className="habits">
      <div className="tracker-head">
        <div>
          <p className="eyebrow">Project 05</p>
          <h1 className="display tracker-title">Habit Tracker</h1>
        </div>
      </div>

      {habits && habits.length > 0 && (
        <div className="stats">
          <StatTile
            label="Done today"
            value={`${stats.doneToday} / ${stats.total}`}
            tone={stats.doneToday === stats.total ? 'ok' : 'accent'}
          />
          <StatTile
            label="Longest streak now"
            value={`${stats.longest?.currentStreak ?? 0} days`}
            hint={stats.longest?.name ?? 'Tick a habit to start one'}
          />
          <StatTile label="Best ever" value={`${stats.bestEver} days`} />
        </div>
      )}

      <section className="card">
        <h2 className="section-title">New habit</h2>
        <HabitForm submitLabel="Add habit" onSave={create} />
        <p className="muted small hab-note">
          Habits with a nudge time send a push notification if they aren&apos;t done yet. Turn on notifications
          on each device in <Link to={REMINDERS_BASE}>Reminders</Link>.
        </p>
      </section>

      {error && !habits && <ErrorState error={error} onRetry={() => setVersion((v) => v + 1)} />}
      {!habits && !error && <LoadingState label="Loading habits\u2026" />}
      {habits && habits.length === 0 && <EmptyState title="No habits yet">Add your first habit above.</EmptyState>}

      {habits && habits.length > 0 && (
        <div className="hab-grid">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              today={today}
              onSetDay={(date, value) => void setDay(habit, date, value)}
              onEdit={() => setEditing(habit)}
              onDelete={() => setDeleting(habit)}
            />
          ))}
        </div>
      )}

      <Modal open={editing !== null} title="Edit habit" onClose={() => setEditing(null)}>
        {editing && <HabitForm initial={editing} submitLabel="Save changes" onSave={saveEdit} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog open={deleting !== null} onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)}>
        Delete the habit <strong>{deleting?.name}</strong> and its whole history? This cannot be undone.
      </ConfirmDialog>
    </div>
  )
}