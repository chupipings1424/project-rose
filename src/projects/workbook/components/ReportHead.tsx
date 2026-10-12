import type { ReportSummary } from '../api/types'

interface ReportHeadProps {
  title: string
  data: ReportSummary
  onYear: (year: string) => void
}

/** Title, year picker and Print button shared by the payment and budget reports. */
export function ReportHead({ title, data, onYear }: ReportHeadProps) {
  return (
    <section className="report-head">
      <div>
        <p className="eyebrow">Report</p>
        <h2 className="display">
          {title} · {data.year}
        </h2>
        <p className="muted small">
          Generated {new Date(data.generated_at).toLocaleString()} from <code>{data.workbook}</code>
        </p>
      </div>
      <div className="button-row no-print">
        <label className="inline">
          <span className="field-label">Year</span>
          <select value={data.year} onChange={(e) => onYear(e.target.value)}>
            {(data.years.length ? data.years : [data.year]).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn ghost" onClick={() => window.print()}>
          Print / PDF
        </button>
      </div>
    </section>
  )
}