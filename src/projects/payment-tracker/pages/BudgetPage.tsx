import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { TrashIcon } from '../../../components/icons'
import { StatTile } from '../../../components/StatTile'
import { ErrorState, LoadingState } from '../../../components/States'
import { useToast } from '../../../components/toast/useToast'
import { useAsync } from '../../../hooks/useAsync'
import { trackerApi } from '../api/client'
import type { Budget, BudgetLine, BudgetSection } from '../api/types'
import { CopyYearDialog, EditLineDialog, NewLineDialog } from '../components/BudgetDialogs'
import { BudgetSectionTable } from '../components/BudgetSectionTable'
import { ImportDialog } from '../components/ImportDialog'
import { NetTable } from '../components/NetTable'
import { useCurrency } from '../../../currency/useCurrency'

export default function BudgetPage() {
  const { money } = useCurrency()
  const notify = useToast()
  const [params, setParams] = useSearchParams()
  const yearParam = params.get('year')
  const budget = useAsync(() => trackerApi.budget(yearParam), [yearParam])

  const [newOpen, setNewOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetLine | null>(null)
  const [deleting, setDeleting] = useState<{ line: BudgetLine; section: BudgetSection } | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteYearOpen, setDeleteYearOpen] = useState(false)
  const [deletingYear, setDeletingYear] = useState(false)

  if (budget.loading && !budget.data) return <LoadingState />
  if (budget.error && !budget.data) return <ErrorState error={budget.error} onRetry={budget.reload} />
  const data = budget.data
  if (!data) return null

  const year = data.year
  const yearOptions = [...new Set([...data.years, data.year])].sort((a, b) => a - b)

  // Every write endpoint returns the fresh budget, so we just swap it in.
  function apply(next: Budget, message: string) {
    budget.setData(next)
    notify(message, 'success')
  }

  async function commitCell(line: BudgetLine, month: number, value: string) {
    try {
      const result = await trackerApi.updateBudgetCell(line.id, month, value, year)
      apply(result.budget, 'Saved to Excel')
    } catch (error) {
      notify((error as Error).message, 'error')
      budget.reload()
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      const result = await trackerApi.deleteBudgetLine(deleting.line.id, year)
      apply(result.budget, 'Deleted from Excel')
      setDeleting(null)
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  const deleteNoun = deleting?.section.name === 'Revenue' ? 'revenue' : 'expense'
  const monthsUsed = deleting?.line.amounts.filter(Boolean).length ?? 0

  async function confirmDeleteYear() {
    setDeletingYear(true)
    try {
      const result = await trackerApi.deleteBudgetYear(year)
      budget.setData(result.budget)
      setParams({})
      setDeleteYearOpen(false)
      notify(`Deleted ${result.deleted} line(s) from ${year}`, 'success')
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setDeletingYear(false)
    }
  }

  return (
    <div className="stack">
      <section className="card toolbar">
        <div className="toolbar-field inline field-with-action">
          <label>
            <span className="field-label">Year</span>
            <select value={year} onChange={(e) => setParams({ year: e.target.value })}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn icon-danger"
            onClick={() => setDeleteYearOpen(true)}
            disabled={data.line_count === 0}
            aria-label={`Delete budget year ${year}`}
            title={data.line_count === 0 ? `${year} has no lines to delete` : `Delete every line in ${year}`}
          >
            <TrashIcon />
          </button>
        </div>
        <div className="button-row">
          <button type="button" className="btn primary" onClick={() => setNewOpen(true)}>
            + New line
          </button>
          <button type="button" className="btn ghost" onClick={() => setCopyOpen(true)}>
            Copy from another year
          </button>
          <button type="button" className="btn ghost" onClick={() => setImportOpen(true)}>
            Import
          </button>
        </div>
      </section>

      <section className="card">
        <div className="stats">
          <StatTile label="Total revenue" value={money(data.total_revenue)} tone="ok" />
          <StatTile label="Total expenses" value={money(data.total_expenses)} tone="warn" />
          <StatTile label="Net" value={money(data.net)} tone={data.net >= 0 ? 'ok' : 'danger'} />
          <StatTile label="Line items" value={data.line_count} />
        </div>
        <p className="muted small">
          Click any month cell to type an amount. Press Enter or click away to save it to the Excel workbook.
        </p>
      </section>

      {data.sections.map((section) => (
        <BudgetSectionTable
          key={section.name}
          section={section}
          months={data.months}
          onCellCommit={(line, month, value) => void commitCell(line, month, value)}
          onEdit={(line) => setEditing(line)}
          onDelete={(line, s) => setDeleting({ line, section: s })}
        />
      ))}
      <NetTable budget={data} />

      <NewLineDialog
        open={newOpen}
        knownGroups={data.known_groups}
        onClose={() => setNewOpen(false)}
        onSubmit={async (values) => {
          const result = await trackerApi.addBudgetLine({ ...values, year })
          setNewOpen(false)
          apply(result.budget, 'Line added')
        }}
      />

      <EditLineDialog
        line={editing}
        knownGroups={editing ? data.known_groups[editing.section] ?? [] : []}
        onClose={() => setEditing(null)}
        onSubmit={async (line, changes) => {
          const result = await trackerApi.updateBudgetLine(line.id, changes, year)
          setEditing(null)
          apply(result.budget, 'Changes saved to Excel')
        }}
      />

      <CopyYearDialog
        open={copyOpen}
        years={data.years}
        currentYear={year}
        onClose={() => setCopyOpen(false)}
        onSubmit={async (from, to, includeAmounts) => {
          const result = await trackerApi.copyBudgetYear(from, to, includeAmounts)
          setCopyOpen(false)
          setParams({ year: String(to) })
          notify(`Copied ${result.copied} line(s)`, 'success')
        }}
      />

      <ImportDialog kind="budget" open={importOpen} onClose={() => setImportOpen(false)} onImported={budget.reload} />

      <ConfirmDialog
        open={deleting !== null}
        busy={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      >
        {deleting && (
          <>
            <p>
              Are you sure you want to delete this {deleteNoun}?
              <br />
              <strong>{deleting.line.item}</strong> <span className="muted">({deleting.line.group})</span>
            </p>
            <p className="muted small">
              {deleting.line.total
                ? `This removes ${money(deleting.line.total)} of ${deleteNoun} across ${monthsUsed} month(s). This cannot be undone.`
                : 'This cannot be undone.'}
            </p>
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteYearOpen}
        title="Delete budget year"
        confirmLabel={`Yes, delete ${year}`}
        busy={deletingYear}
        onConfirm={() => void confirmDeleteYear()}
        onCancel={() => setDeleteYearOpen(false)}
      >
        <p>
          Are you sure you want to delete the whole <strong>{year}</strong> budget?
        </p>
        <p className="muted small">
          This removes all {data.line_count} line(s) — {money(data.total_revenue)} revenue and{' '}
          {money(data.total_expenses)} expenses — and the “Budget {year}” sheet from the Excel file. This cannot be
          undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}