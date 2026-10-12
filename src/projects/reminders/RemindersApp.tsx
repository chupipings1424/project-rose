import { useEffect, useMemo, useState } from 'react'
import type { Reminder, ReminderInput } from './model'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { useToast } from '../../components/toast/useToast'
import { useAsync } from '../../hooks/useAsync'
import { remindersApi } from './api/client'
import { NotificationCard } from './components/NotificationCard'
import { ReminderForm } from './components/ReminderForm'
import { ReminderRow } from './components/ReminderRow'
import { statusOf, type ReminderStatus } from './lib/status'
import './reminders.css'

/** The worker checks every 15s, so the page refreshes at the same pace. */
const REFRESH_MS = 15_000

const SECTIONS: { status: ReminderStatus[]; title: string }[] = [
  { status: ['ringing'], title: 'Ringing now' },
  { status: ['overdue'], title: 'Missed' },
  { status: ['snoozed', 'upcoming'], title: 'Upcoming' },
]

export default function RemindersApp() {
  const notify = useToast()
  const items = useAsync(() => remindersApi.list(), [])
  const { reload } = items
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [deleting, setDeleting] = useState<Reminder | null>(null)
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(reload, REFRESH_MS)
    const onVisible = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  const grouped = useMemo(() => {
    const groups = new Map<ReminderStatus, Reminder[]>()
    for (const reminder of items.data ?? []) {
      const status = statusOf(reminder)
      groups.set(status, [...(groups.get(status) ?? []), reminder])
    }
    return groups
  }, [items.data])

  /** Runs one action for one reminder, then refreshes the list. */
  async function act(reminder: Reminder, action: () => Promise<unknown>, message?: string) {
    setBusyId(reminder.id)
    try {
      await action()
      if (message) notify(message, 'success')
      reload()
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function create(input: ReminderInput) {
    await remindersApi.create(input)
    notify('Reminder saved', 'success')
    reload()
  }

  async function saveEdit(input: ReminderInput) {
    if (!editing) return
    await remindersApi.update(editing.id, input)
    setEditing(null)
    notify('Reminder updated', 'success')
    reload()
  }

  async function confirmDelete() {
    if (!deleting) return
    const target = deleting
    setDeleting(null)
    await act(target, () => remindersApi.remove(target.id), 'Reminder deleted')
  }

  function renderList(list: Reminder[]) {
    return (
      <ul className="rem-list">
        {list.map((reminder) => (
          <ReminderRow
            key={reminder.id}
            reminder={reminder}
            busy={busyId === reminder.id}
            onComplete={() => void act(reminder, () => remindersApi.complete(reminder.id), 'Marked as done')}
            onDismiss={() => void act(reminder, () => remindersApi.dismiss(reminder.id))}
            onSnooze={(minutes) =>
              void act(reminder, () => remindersApi.snooze(reminder.id, minutes), `Snoozed for ${minutes} min`)
            }
            onEdit={() => setEditing(reminder)}
            onDelete={() => setDeleting(reminder)}
          />
        ))}
      </ul>
    )
  }

  const done = grouped.get('done') ?? []
  const active = (items.data?.length ?? 0) - done.length

  return (
    <div className="reminders">
      <div className="tracker-head">
        <div>
          <p className="eyebrow">Project 02</p>
          <h1 className="display tracker-title">Reminders</h1>
        </div>
      </div>

      <NotificationCard />

      <section className="card">
        <h2 className="section-title">New reminder</h2>
        <ReminderForm submitLabel="Add reminder" onSave={create} />
      </section>

      {items.error && !items.data && <ErrorState error={items.error} onRetry={reload} />}
      {items.error && items.data && (
        <div className="banner banner-error" role="alert">
          <span>{items.error.message}</span>
        </div>
      )}
      {!items.data && items.loading && <LoadingState label="Loading reminders…" />}

      {items.data && active === 0 && (
        <EmptyState title="Nothing to remember">Add your first reminder above.</EmptyState>
      )}

      {items.data &&
        SECTIONS.map(({ status, title }) => {
          const list = status.flatMap((s) => grouped.get(s) ?? [])
          if (list.length === 0) return null
          list.sort((a, b) => (a.snoozedUntil ?? a.dueAt).localeCompare(b.snoozedUntil ?? b.dueAt))
          return (
            <section key={title} className={`card rem-section is-${status[0]}`}>
              <h2 className="section-title">
                {title} <span className="muted small">({list.length})</span>
              </h2>
              {renderList(list)}
            </section>
          )
        })}

      {done.length > 0 && (
        <section className="card rem-section is-done">
          <button type="button" className="rem-toggle" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
            <span className="section-title">Done ({done.length})</span>
            <span aria-hidden="true">{showDone ? '▴' : '▾'}</span>
          </button>
          {showDone && renderList(done)}
        </section>
      )}

      <Modal open={editing !== null} title="Edit reminder" onClose={() => setEditing(null)}>
        {editing && (
          <ReminderForm
            key={editing.id}
            initial={editing}
            submitLabel="Save changes"
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog open={deleting !== null} onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)}>
        Delete the reminder <strong>{deleting?.text}</strong>? This cannot be undone.
      </ConfirmDialog>
    </div>
  )
}