import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Modal } from '../../../components/Modal'
import { StatTile } from '../../../components/StatTile'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { useToast } from '../../../components/toast/useToast'
import { CurrencyPicker } from '../../../currency/CurrencyPicker'
import { useCurrency } from '../../../currency/useCurrency'
import { useAsync } from '../../../hooks/useAsync'
import { useAutoRefresh } from '../../../hooks/useAutoRefresh'
import { shortDate } from '../../../lib/format'
import { loansApi } from '../api/client'
import { LoanCard } from '../components/LoanCard'
import { LoanForm } from '../components/LoanForm'
import { LoanSchedule } from '../components/LoanSchedule'
import { summarize } from '../lib/summary'
import type { Loan, LoanInput } from '../model'
import { loansPaths } from '../paths'

export default function LoansPage() {
  const notify = useToast()
  const { money } = useCurrency()
  const loans = useAsync(() => loansApi.list(), [])
  const { data, setData, reload } = loans
  // Payments are worked out from today's date, so a refresh after midnight moves them on.
  useAutoRefresh(reload)
  const [editing, setEditing] = useState<Loan | null>(null)
  const [deleting, setDeleting] = useState<Loan | null>(null)
  const [scheduleOf, setScheduleOf] = useState<string | null>(null)

  const summary = useMemo(() => summarize(data ?? []), [data])
  const running = useMemo(() => (data ?? []).filter((l) => l.status !== 'completed'), [data])
  const completed = useMemo(() => (data ?? []).filter((l) => l.status === 'completed'), [data])
  const schedule = data?.find((l) => l.id === scheduleOf) ?? null

  async function create(input: LoanInput) {
    await loansApi.create(input)
    // Reload rather than append: the server decides the order (soonest finish first).
    reload()
    notify('Loan added', 'success')
  }

  async function saveEdit(input: LoanInput) {
    if (!editing) return
    const changed = await loansApi.update(editing.id, input)
    setData((data ?? []).map((l) => (l.id === changed.id ? changed : l)))
    setEditing(null)
    notify('Loan updated', 'success')
  }

  async function confirmDelete() {
    if (!deleting) return
    const target = deleting
    setDeleting(null)
    try {
      await loansApi.remove(target.id)
      setData((data ?? []).filter((l) => l.id !== target.id))
      notify('Loan deleted', 'success')
    } catch (error) {
      notify((error as Error).message, 'error')
    }
  }

  const renderLoans = (list: Loan[]) => (
    <div className="loan-grid">
      {list.map((loan) => (
        <LoanCard
          key={loan.id}
          loan={loan}
          onSchedule={() => setScheduleOf(loan.id)}
          onEdit={() => setEditing(loan)}
          onDelete={() => setDeleting(loan)}
        />
      ))}
    </div>
  )

  return (
    <div className="loans">
      <div className="tracker-head">
        <div>
          <p className="eyebrow">Project 06</p>
          <h1 className="display tracker-title">Loan Tracker</h1>
        </div>
        <div className="tracker-actions">
          <Link className="btn ghost" to={loansPaths.report}>
            Report
          </Link>
          <CurrencyPicker />
        </div>
      </div>

      {data && data.length > 0 && (
        <div className="stats">
          <StatTile label="Balance" value={money(summary.balance)} tone="accent" hint={`${money(summary.monthly)} a month`} />
          <StatTile label="Paid so far" value={money(summary.paid)} tone="ok" />
          <StatTile
            label="Loans"
            value={summary.running}
            hint={summary.nextDue ? `next due ${shortDate(summary.nextDue)}` : `${summary.completed} completed`}
          />
        </div>
      )}

      <section className="card">
        <h2 className="section-title">New loan</h2>
        <p className="muted small">
          Payments are counted automatically on the loan date&apos;s day of every month, starting a month after the
          loan date. Old loans work too - enter the real loan date.
        </p>
        <LoanForm submitLabel="Add loan" onSave={create} />
      </section>

      {loans.error && !data && <ErrorState error={loans.error} onRetry={reload} />}
      {!data && loans.loading && <LoadingState label="Loading loans\u2026" />}
      {data && data.length === 0 && <EmptyState title="No loans yet">Add your first loan above.</EmptyState>}

      {running.length > 0 && renderLoans(running)}
      {completed.length > 0 && (
        <section>
          <h2 className="section-title">Completed ({completed.length})</h2>
          {renderLoans(completed)}
        </section>
      )}

      <Modal open={schedule !== null} wide title={`Schedule \u00B7 ${schedule?.name ?? ''}`} onClose={() => setScheduleOf(null)}>
        {schedule && <LoanSchedule loan={schedule} />}
      </Modal>

      <Modal open={editing !== null} title="Edit loan" onClose={() => setEditing(null)}>
        {editing && (
          <LoanForm initial={editing} submitLabel="Save changes" onSave={saveEdit} onCancel={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDialog open={deleting !== null} onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)}>
        Delete the loan <strong>{deleting?.name}</strong> and its schedule? This cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
