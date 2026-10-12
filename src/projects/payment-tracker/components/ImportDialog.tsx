import { useState } from 'react'
import { Modal } from '../../../components/Modal'
import { trackerApi } from '../api/client'
import type { ImportKind, ImportMode, ImportPlan } from '../api/types'

const KINDS: Record<ImportKind, { title: string; hint: string; columns: string; showYear: boolean }> = {
  budget: {
    title: 'Import budget data',
    hint: 'A .csv or .xlsx with one row per line item and a column per month.',
    columns: 'Year, Section, Group, Item, Jan … Dec, Notes',
    showYear: true,
  },
  payments: {
    title: 'Import payment history',
    hint: 'A .csv or .xlsx of past payments. Titles that do not exist yet are created for you.',
    columns: 'Title, Amount, Date, Time, Status, Due Date, Note',
    showYear: false,
  },
}

const PREVIEW_LIMIT = 60
const amountFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface Props {
  kind: ImportKind
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function ImportDialog({ kind, open, onClose, onImported }: Props) {
  return (
    <Modal open={open} title={KINDS[kind].title} onClose={onClose} wide>
      <ImportForm kind={kind} onClose={onClose} onImported={onImported} />
    </Modal>
  )
}

function ImportForm({ kind, onClose, onImported }: Omit<Props, 'open'>) {
  const config = KINDS[kind]
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<ImportMode>('skip')
  const [year, setYear] = useState(() => String(new Date().getFullYear()))
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [applied, setApplied] = useState(false)
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Any change to the inputs invalidates the previous preview.
  function resetPreview() {
    setPlan(null)
    setApplied(false)
    setError(null)
  }

  async function send(dryRun: boolean) {
    if (!file) {
      setError('Choose a file first.')
      return
    }
    setBusy(dryRun ? 'preview' : 'import')
    setError(null)
    try {
      const result = await trackerApi.importFile(kind, {
        file,
        mode,
        dryRun,
        year: config.showYear ? year : undefined,
      })
      setPlan(result)
      setApplied(!dryRun)
      if (!dryRun) onImported()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const counts = plan?.counts
  const canImport = !!plan && !applied && (counts?.add ?? 0) + (counts?.replace ?? 0) > 0
  const visible = plan
    ? plan.entries.filter((e) => e.action !== 'add' || plan.entries.length <= PREVIEW_LIMIT).slice(0, PREVIEW_LIMIT)
    : []

  return (
    <div className="stack-form">
      <p className="muted small">
        {config.hint}
        <br />
        Columns: <code>{config.columns}</code>
      </p>
      <label>
        File
        <input
          type="file"
          accept=".csv,.xlsx,.xlsm,.txt"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            resetPreview()
          }}
        />
      </label>
      <div className="two-col">
        <label>
          If a row already exists
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as ImportMode)
              resetPreview()
            }}
          >
            <option value="skip">Skip it</option>
            <option value="replace">Overwrite it</option>
          </select>
        </label>
        {config.showYear && (
          <label>
            Year for rows without one
            <input type="number" step="1" value={year} onChange={(e) => setYear(e.target.value)} />
          </label>
        )}
      </div>

      {busy && <p className="muted small">{busy === 'preview' ? 'Reading the file…' : 'Writing to the workbook…'}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {plan && counts && (
        <div className="import-result">
          {applied && (
            <p className="import-ok">
              Imported. {counts.add} added{counts.replace ? `, ${counts.replace} overwritten` : ''}.
            </p>
          )}
          {!applied && !canImport && <p className="muted small">Nothing new to import from this file.</p>}
          <div className="chips">
            {counts.add > 0 && <span className="chip chip-add">{counts.add} to add</span>}
            {counts.replace > 0 && <span className="chip chip-replace">{counts.replace} to overwrite</span>}
            {counts.skip > 0 && <span className="chip chip-skip">{counts.skip} skipped</span>}
            {counts.error > 0 && <span className="chip chip-error">{counts.error} with problems</span>}
          </div>
          <div className="table-wrap import-table">
            <table>
              <thead>
                <tr>
                  <th>Where</th>
                  <th>Item</th>
                  <th className="num">Amount</th>
                  <th>Action</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry, index) => {
                  const value = entry.total ?? entry.amount
                  return (
                    <tr key={`${entry.row ?? 'derived'}-${index}`}>
                      <td>{entry.row ? `Row ${entry.row}` : 'Derived'}</td>
                      <td>{entry.item || '—'}</td>
                      <td className="num">{value === undefined ? '' : amountFormat.format(value)}</td>
                      <td>
                        <span className={`chip chip-${entry.action}`}>{entry.action}</span>
                      </td>
                      <td className="muted">{entry.reason ?? ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {plan.entries.length > PREVIEW_LIMIT && (
            <p className="muted small">
              Showing the first {PREVIEW_LIMIT} of {plan.entries.length} rows.
            </p>
          )}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={() => void send(true)} disabled={busy !== null}>
          Preview
        </button>
        <button type="button" className="btn primary" onClick={() => void send(false)} disabled={!canImport || busy !== null}>
          Import
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
        <a className="btn link" href={trackerApi.sampleUrl(kind)}>
          Download example file
        </a>
      </div>
    </div>
  )
}