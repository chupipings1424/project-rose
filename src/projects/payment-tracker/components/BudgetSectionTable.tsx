import { useState } from 'react'
import type { BudgetLine, BudgetSection } from '../api/types'
import { useCurrency } from '../../../currency/useCurrency'

interface Props {
  section: BudgetSection
  months: string[]
  onCellCommit: (line: BudgetLine, monthIndex: number, value: string) => void
  onEdit: (line: BudgetLine, section: BudgetSection) => void
  onDelete: (line: BudgetLine, section: BudgetSection) => void
}

/**
 * One editable month cell. It keeps a local "draft" while you type and only
 * saves on blur / Enter. The parent gives it a `key` containing the saved
 * amount, so when the server returns a new value React re-creates the cell
 * with a fresh draft (the "reset state with a key" pattern).
 */
function BudgetCell({ amount, onCommit, label }: { amount: number; onCommit: (value: string) => void; label: string }) {
  const [draft, setDraft] = useState(amount ? amount.toFixed(2) : '')

  return (
    <input
      className="cell"
      type="number"
      step="0.01"
      placeholder="0.00"
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if ((Number(draft) || 0) !== amount) onCommit(draft)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setDraft(amount ? amount.toFixed(2) : '')
        }
      }}
    />
  )
}

export function BudgetSectionTable({ section, months, onCellCommit, onEdit, onDelete }: Props) {
  const { money } = useCurrency()
  const noun = section.name === 'Revenue' ? 'revenue' : 'expense'
  const columnCount = months.length + 3

  return (
    <section className="card budget-section">
      <div className={`section-banner banner-${section.name.toLowerCase()}`}>{section.label.toUpperCase()}</div>
      <div className="table-wrap">
        <table className="budget-table">
          <tbody>
            {section.groups.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="muted">
                  No {section.label.toLowerCase()} lines yet — use “+ New line”.
                </td>
              </tr>
            )}
            {section.groups.map((group) => (
              // A Fragment with a key lets one map() return several sibling rows.
              <GroupRows key={group.name || 'uncategorised'} group={group} months={months}>
                {group.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="item-cell" title={line.notes}>
                      {line.item}
                    </td>
                    {line.amounts.map((amount, i) => (
                      <td key={`${line.id}-${i}-${amount}`} className="num">
                        <BudgetCell
                          amount={amount}
                          label={`${line.item} ${months[i]}`}
                          onCommit={(value) => onCellCommit(line, i, value)}
                        />
                      </td>
                    ))}
                    <td className="num strong">{money(line.total)}</td>
                    <td className="actions-col">
                      <button type="button" className="icon-btn" title={`Edit this ${noun}`} onClick={() => onEdit(line, section)}>
                        ✎
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger-text"
                        title={`Delete this ${noun}`}
                        onClick={() => onDelete(line, section)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </GroupRows>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL {section.label.toUpperCase()}</td>
              {section.monthly.map((value, i) => (
                <td key={i} className="num">
                  {money(value)}
                </td>
              ))}
              <td className="num">{money(section.total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

function GroupRows({
  group,
  months,
  children,
}: {
  group: BudgetSection['groups'][number]
  months: string[]
  children: React.ReactNode
}) {
  const { money } = useCurrency()
  return (
    <>
      <tr className="group-row">
        <th>{(group.name || 'Uncategorised').toUpperCase()}</th>
        {months.map((m) => (
          <th key={m} className="num">
            {m.toUpperCase()}
          </th>
        ))}
        <th className="num">TOTAL</th>
        <th className="actions-col" />
      </tr>
      {children}
      <tr className="subtotal-row">
        <td>Total</td>
        {group.monthly.map((value, i) => (
          <td key={i} className="num">
            {money(value)}
          </td>
        ))}
        <td className="num">{money(group.total)}</td>
        <td />
      </tr>
    </>
  )
}