import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { TrashIcon } from '../../../components/icons'
import { ErrorState, LoadingState } from '../../../components/States'
import { useToast } from '../../../components/toast/useToast'
import { useAsync } from '../../../hooks/useAsync'
import { trackerApi } from '../api/client'
import type { Payment, Summary } from '../api/types'
import { AccountSummaryCard } from '../components/AccountSummaryCard'
import { ImportDialog } from '../components/ImportDialog'
import { NewTitleDialog } from '../components/NewTitleDialog'
import { PaymentForm } from '../components/PaymentForm'
import { PaymentsTable } from '../components/PaymentsTable'
import { useCurrency } from '../../../currency/useCurrency'

export default function PaymentsPage() {
  const { money } = useCurrency()
  const notify = useToast()
  // The selected title lives in the URL (?title=Car%20Loan) so refresh / back / bookmarks work.
  const [params, setParams] = useSearchParams()
  const selected = params.get('title') ?? ''

  const accounts = useAsync(() => trackerApi.accounts(), [])
  const summary = useAsync<Summary | null>(
    () => (selected ? trackerApi.summary(selected) : Promise.resolve(null)),
    [selected],
  )

  const [showTable, setShowTable] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newTitleOpen, setNewTitleOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Payment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteTitleOpen, setDeleteTitleOpen] = useState(false)
  const [deletingTitle, setDeletingTitle] = useState(false)

  function selectTitle(title: string) {
    setParams(title ? { title } : {})
    setShowForm(false)
  }

  async function toggleStatus(payment: Payment) {
    if (!summary.data) return
    try {
      const next = payment.status === 'Paid' ? 'Unpaid' : 'Paid'
      const result = await trackerApi.setPaymentStatus(payment.id, next, summary.data.title)
      summary.setData(result.summary)
    } catch (error) {
      notify((error as Error).message, 'error')
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await trackerApi.deletePayment(pendingDelete.id)
      summary.reload()
      notify('Payment deleted', 'success')
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  async function confirmDeleteTitle() {
    if (!selected) return
    setDeletingTitle(true)
    try {
      const result = await trackerApi.deleteAccount(selected)
      accounts.setData(result.accounts)
      selectTitle('')
      setDeleteTitleOpen(false)
      notify(`Deleted “${selected}” and ${result.deleted_payments} payment(s)`, 'success')
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setDeletingTitle(false)
    }
  }

  const titlePayments = summary.data?.payments ?? []

  return (
    <div className="stack">
      <section className="card toolbar">
        <div className="toolbar-field field-with-action">
          <label>
            <span className="field-label">Select a title</span>
            <select
              value={selected}
              onChange={(e) => selectTitle(e.target.value)}
              disabled={accounts.loading && !accounts.data}
            >
              <option value="">{accounts.loading && !accounts.data ? 'Loading…' : '— choose a title —'}</option>
              {accounts.data?.map((a) => (
                <option key={a.title} value={a.title}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn icon-danger"
            onClick={() => setDeleteTitleOpen(true)}
            disabled={!selected}
            aria-label={selected ? `Delete title ${selected}` : 'Delete title'}
            title={selected ? `Delete “${selected}”` : 'Select a title to delete it'}
          >
            <TrashIcon />
          </button>
        </div>
        <div className="button-row">
          <button type="button" className="btn ghost" onClick={() => setNewTitleOpen(true)}>
            + New title
          </button>
          <button type="button" className="btn ghost" onClick={() => setImportOpen(true)}>
            Import
          </button>
        </div>
      </section>

      {accounts.error && <ErrorState error={accounts.error} onRetry={accounts.reload} />}

      {selected && summary.loading && !summary.data && <LoadingState />}
      {selected && summary.error && <ErrorState error={summary.error} onRetry={summary.reload} />}

      {summary.data && (
        <>
          <AccountSummaryCard
            summary={summary.data}
            showTable={showTable}
            showForm={showForm}
            onToggleTable={() => setShowTable((v) => !v)}
            onToggleForm={() => setShowForm((v) => !v)}
          />
          {showForm && <PaymentForm summary={summary.data} onSaved={summary.setData} />}
          {showTable && (
            <PaymentsTable payments={summary.data.payments} onToggleStatus={toggleStatus} onDelete={setPendingDelete} />
          )}
        </>
      )}

      {!selected && accounts.data && accounts.data.length === 0 && (
        <p className="muted center">No titles yet — create one with “+ New title” or import your history.</p>
      )}

      <NewTitleDialog
        open={newTitleOpen}
        onClose={() => setNewTitleOpen(false)}
        onCreated={(title) => {
          setNewTitleOpen(false)
          accounts.reload()
          selectTitle(title)
          notify('Title created with its payment schedule', 'success')
        }}
      />

      <ImportDialog
        kind="payments"
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          accounts.reload()
          summary.reload()
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      >
        {pendingDelete && (
          <>
            <p>
              Delete the {money(pendingDelete.amount)} payment dated {pendingDelete.date}?
            </p>
            <p className="muted small">
              {pendingDelete.status}
              {pendingDelete.note ? ` — ${pendingDelete.note}` : ''}. This removes the row from the Excel file and cannot be
              undone.
            </p>
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteTitleOpen}
        title="Delete title"
        confirmLabel="Yes, delete title"
        busy={deletingTitle}
        onConfirm={() => void confirmDeleteTitle()}
        onCancel={() => setDeleteTitleOpen(false)}
      >
        <p>
          Are you sure you want to delete <strong>{selected}</strong>?
        </p>
        <p className="muted small">
          {summary.data
            ? `This removes the title and all ${titlePayments.length} payment(s) under it (${money(summary.data.total_paid)} paid so far) from the Excel file.`
            : 'This removes the title and every payment under it from the Excel file.'}{' '}
          This cannot be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}