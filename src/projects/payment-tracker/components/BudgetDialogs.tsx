import { useState, type FormEvent } from 'react'
import { Modal } from '../../../components/Modal'
import type { BudgetLine, BudgetSectionName } from '../api/types'

// ---------------------------------------------------------------------------
// New line
// ---------------------------------------------------------------------------
export interface NewLineValues {
  section: BudgetSectionName
  group: string
  item: string
  notes: string
}

interface NewLineDialogProps {
  open: boolean
  knownGroups: Record<BudgetSectionName, string[]>
  onClose: () => void
  onSubmit: (values: NewLineValues) => Promise<void>
}

export function NewLineDialog({ open, knownGroups, onClose, onSubmit }: NewLineDialogProps) {
  return (
    <Modal open={open} title="New budget line" onClose={onClose}>
      <NewLineForm knownGroups={knownGroups} onClose={onClose} onSubmit={onSubmit} />
    </Modal>
  )
}

function NewLineForm({ knownGroups, onClose, onSubmit }: Omit<NewLineDialogProps, 'open'>) {
  const [values, setValues] = useState<NewLineValues>({ section: 'Expense', group: '', item: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // One generic updater for every field: `K` is a key of NewLineValues.
  const update = <K extends keyof NewLineValues>(key: K, value: NewLineValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(values)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Section
        <select value={values.section} onChange={(e) => update('section', e.target.value as BudgetSectionName)}>
          <option value="Revenue">Revenue (income)</option>
          <option value="Expense">Expense</option>
        </select>
      </label>
      <label>
        Group
        <input
          type="text"
          list="new-line-groups"
          placeholder="Home"
          required
          value={values.group}
          onChange={(e) => update('group', e.target.value)}
        />
        <datalist id="new-line-groups">
          {(knownGroups[values.section] ?? []).map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </label>
      <label>
        Item
        <input type="text" required placeholder="Utilities" value={values.item} onChange={(e) => update('item', e.target.value)} autoFocus />
      </label>
      <label>
        Notes
        <input type="text" value={values.notes} onChange={(e) => update('notes', e.target.value)} />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create'}
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Edit line
// ---------------------------------------------------------------------------
interface EditLineDialogProps {
  line: BudgetLine | null
  knownGroups: string[]
  onClose: () => void
  onSubmit: (line: BudgetLine, changes: Pick<BudgetLine, 'item' | 'group' | 'notes'>) => Promise<void>
}

export function EditLineDialog({ line, knownGroups, onClose, onSubmit }: EditLineDialogProps) {
  const noun = line?.section === 'Revenue' ? 'revenue' : 'expense'
  return (
    <Modal open={line !== null} title={`Edit ${noun}`} onClose={onClose}>
      {line && <EditLineForm line={line} knownGroups={knownGroups} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  )
}

function EditLineForm({ line, knownGroups, onClose, onSubmit }: EditLineDialogProps & { line: BudgetLine }) {
  const [item, setItem] = useState(line.item)
  const [group, setGroup] = useState(line.group)
  const [notes, setNotes] = useState(line.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(line, { item, group, notes })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Item
        <input type="text" required value={item} onChange={(e) => setItem(e.target.value)} autoFocus />
      </label>
      <label>
        Group
        <input type="text" list="edit-line-groups" required value={group} onChange={(e) => setGroup(e.target.value)} />
        <datalist id="edit-line-groups">
          {knownGroups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </label>
      <label>
        Notes
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <p className="muted small">Monthly amounts are edited directly in the grid.</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Copy year
// ---------------------------------------------------------------------------
interface CopyYearDialogProps {
  open: boolean
  years: number[]
  currentYear: number
  onClose: () => void
  onSubmit: (from: number, to: number, includeAmounts: boolean) => Promise<void>
}

export function CopyYearDialog({ open, years, currentYear, onClose, onSubmit }: CopyYearDialogProps) {
  return (
    <Modal open={open} title="Copy budget lines" onClose={onClose}>
      <CopyYearForm years={years} currentYear={currentYear} onClose={onClose} onSubmit={onSubmit} />
    </Modal>
  )
}

function CopyYearForm({ years, currentYear, onClose, onSubmit }: Omit<CopyYearDialogProps, 'open'>) {
  const options = years.length ? years : [currentYear]
  const [from, setFrom] = useState(options.includes(currentYear) ? currentYear : options[0])
  const [to, setTo] = useState(String(currentYear + 1))
  const [includeAmounts, setIncludeAmounts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(from, Number(to), includeAmounts)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        From year
        <select value={from} onChange={(e) => setFrom(Number(e.target.value))}>
          {options.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label>
        To year
        <input type="number" step="1" required value={to} onChange={(e) => setTo(e.target.value)} />
      </label>
      <label className="checkbox">
        <input type="checkbox" checked={includeAmounts} onChange={(e) => setIncludeAmounts(e.target.checked)} />
        Also copy the amounts
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Copying…' : 'Copy'}
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  )
}