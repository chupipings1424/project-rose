import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { StatTile } from '../../components/StatTile'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { useToast } from '../../components/toast/useToast'
import { CurrencyPicker } from '../../currency/CurrencyPicker'
import { useCurrency } from '../../currency/useCurrency'
import { useAsync } from '../../hooks/useAsync'
import { savingsApi } from './api/client'
import { EntryForm } from './components/EntryForm'
import { GoalCard } from './components/GoalCard'
import { GoalForm } from './components/GoalForm'
import { GoalHistory } from './components/GoalHistory'
import { summarize } from './lib/summary'
import type { EntryInput, GoalInput, SavingsEntry, SavingsGoal } from './model'
import './savings.css'

export default function SavingsApp() {
  const notify = useToast()
  const { money } = useCurrency()
  const goals = useAsync(() => savingsApi.list(), [])
  const { data, setData, reload } = goals
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null)
  // Dialogs remember the *id*, so they always show the latest copy of the goal.
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [historyOf, setHistoryOf] = useState<string | null>(null)
  const [busyEntry, setBusyEntry] = useState<string | null>(null)

  // Derived state: recalculated only when the list changes, never stored separately.
  const summary = useMemo(() => summarize(data ?? []), [data])
  const active = useMemo(() => (data ?? []).filter((g) => g.status !== 'done'), [data])
  const reached = useMemo(() => (data ?? []).filter((g) => g.status === 'done'), [data])
  const find = (id: string | null) => data?.find((g) => g.id === id) ?? null

  /** Swap one changed goal into the list - an immutable update, no reload needed. */
  function replace(changed: SavingsGoal) {
    setData((data ?? []).map((g) => (g.id === changed.id ? changed : g)))
  }

  async function create(input: GoalInput) {
    const goal = await savingsApi.create(input)
    setData([...(data ?? []), goal])
    notify('Goal created', 'success')
  }

  async function saveEdit(input: GoalInput) {
    if (!editing) return
    replace(await savingsApi.update(editing.id, input))
    setEditing(null)
    notify('Goal updated', 'success')
  }

  async function addEntry(input: EntryInput) {
    if (!addingTo) return
    const before = find(addingTo)
    const goal = await savingsApi.addEntry(addingTo, input)
    replace(goal)
    setAddingTo(null)
    if (goal.status === 'done' && before?.status !== 'done') notify(`Goal reached: ${goal.name}!`, 'success')
    else notify(input.kind === 'deposit' ? `Added ${money(input.amount)}` : `Withdrew ${money(input.amount)}`, 'success')
  }

  async function deleteEntry(goal: SavingsGoal, entry: SavingsEntry) {
    setBusyEntry(entry.id)
    try {
      replace(await savingsApi.removeEntry(goal.id, entry.id))
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setBusyEntry(null)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    const target = deleting
    setDeleting(null)
    try {
      await savingsApi.remove(target.id)
      setData((data ?? []).filter((g) => g.id !== target.id))
      notify('Goal deleted', 'success')
    } catch (error) {
      notify((error as Error).message, 'error')
    }
  }

  const renderGoals = (list: SavingsGoal[]) => (
    <div className="sav-grid">
      {list.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onAdd={() => setAddingTo(goal.id)}
          onHistory={() => setHistoryOf(goal.id)}
          onEdit={() => setEditing(goal)}
          onDelete={() => setDeleting(goal)}
        />
      ))}
    </div>
  )

  const adding = find(addingTo)
  const history = find(historyOf)

  return (
    <div className="savings">
      <div className="tracker-head">
        <div>
          <p className="eyebrow">Project 04</p>
          <h1 className="display tracker-title">Savings Goals</h1>
        </div>
        <div className="tracker-actions">
          <CurrencyPicker />
        </div>
      </div>

      {data && data.length > 0 && (
        <div className="stats">
          <StatTile label="Total saved" value={money(summary.totalSaved)} tone="accent" hint={`${summary.percent.toFixed(0)}% of ${money(summary.totalTarget)}`} />
          <StatTile label="Goals" value={summary.active} hint={`${summary.reached} reached`} />
          <StatTile label="Needed per month" value={money(summary.monthlyNeeded)} tone={summary.monthlyNeeded > 0 ? 'warn' : 'ok'} hint="to make every deadline" />
        </div>
      )}

      <section className="card">
        <h2 className="section-title">New goal</h2>
        <GoalForm submitLabel="Create goal" onSave={create} />
      </section>

      {goals.error && !data && <ErrorState error={goals.error} onRetry={reload} />}
      {!data && goals.loading && <LoadingState label="Loading goals\u2026" />}
      {data && data.length === 0 && <EmptyState title="No goals yet">Create your first goal above.</EmptyState>}

      {active.length > 0 && renderGoals(active)}
      {reached.length > 0 && (
        <section>
          <h2 className="section-title">Reached ({reached.length})</h2>
          {renderGoals(reached)}
        </section>
      )}

      <Modal open={adding !== null} title={`Add money \u00B7 ${adding?.name ?? ''}`} onClose={() => setAddingTo(null)}>
        {adding && <EntryForm saved={adding.saved} onSave={addEntry} onCancel={() => setAddingTo(null)} />}
      </Modal>

      <Modal open={history !== null} wide title={`History \u00B7 ${history?.name ?? ''}`} onClose={() => setHistoryOf(null)}>
        {history && <GoalHistory goal={history} busyId={busyEntry} onDeleteEntry={(e) => void deleteEntry(history, e)} />}
      </Modal>

      <Modal open={editing !== null} title="Edit goal" onClose={() => setEditing(null)}>
        {editing && (
          <GoalForm initial={editing} submitLabel="Save changes" onSave={saveEdit} onCancel={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDialog open={deleting !== null} onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)}>
        Delete the goal <strong>{deleting?.name}</strong> and its whole history? This cannot be undone.
      </ConfirmDialog>
    </div>
  )
}