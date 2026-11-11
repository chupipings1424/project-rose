import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { useToast } from '../../../components/toast/useToast'
import { useCurrency } from '../../../currency/useCurrency'
import { useAsync } from '../../../hooks/useAsync'
import { longDate, shortDate, todayIso } from '../../../lib/format'
import { loansApi } from '../api/client'
import { LoanSchedule } from '../components/LoanSchedule'
import { summarize } from '../lib/summary'
import { STATUS_LABELS } from '../model'
import { loansPaths } from '../paths'

/**
 * A print-friendly report. "Save as PDF" simply opens the browser's print screen
 * (window.print); the @media print rules in loans.css hide the buttons and keep it black on white.
 */
export default function LoanReportPage() {
  const notify = useToast()
  const { money } = useCurrency()
  const loans = useAsync(() => loansApi.list(), [])
  const { data, reload } = loans
  // A lazy initial value: read the clock once, not on every render.
  const [asOf] = useState(todayIso)
  const [downloading, setDownloading] = useState(false)
  const summary = useMemo(() => summarize(data ?? []), [data])

  async function download() {
    setDownloading(true)
    try {
      await loansApi.downloadReport()
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="loans loan-report">
      <div className="tracker-head">
        <div>
          <p className="eyebrow">Project 06 {'\u00B7'} Loan Tracker</p>
          <h1 className="display tracker-title">Loan report</h1>
          <p className="muted small">As of {longDate(asOf)}</p>
        </div>
        <div className="tracker-actions no-print">
          <Link className="btn ghost" to={loansPaths.list}>
            Back to loans
          </Link>
          <button type="button" className="btn ghost" onClick={() => void download()} disabled={downloading}>
            {downloading ? 'Preparing\u2026' : 'Download Excel'}
          </button>
          <button type="button" className="btn primary" onClick={() => window.print()} disabled={!data?.length}>
            Save as PDF
          </button>
        </div>
      </div>

      {loans.error && !data && <ErrorState error={loans.error} onRetry={reload} />}
      {!data && loans.loading && <LoadingState label="Loading loans\u2026" />}
      {data && data.length === 0 && <EmptyState title="No loans yet">Add a loan to see its report.</EmptyState>}

      {data && data.length > 0 && (
        <>
          <section className="card">
            <h2 className="section-title">Summary</h2>
            <div className="table-wrap">
              <table className="loan-summary">
                <thead>
                  <tr>
                    <th>Loan</th>
                    <th>Type</th>
                    <th>Loan date</th>
                    <th>Monthly</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Progress</th>
                    <th>Finish</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((loan) => (
                    <tr key={loan.id}>
                      <td>{loan.name}</td>
                      <td>{loan.type}</td>
                      <td>{shortDate(loan.loanDate)}</td>
                      <td>{money(loan.monthlyAmortization)}</td>
                      <td>{money(loan.totalPayable)}</td>
                      <td>{money(loan.paid)}</td>
                      <td>{money(loan.balance)}</td>
                      <td>
                        {loan.paymentsMade} of {loan.term}
                      </td>
                      <td>{shortDate(loan.finishDate)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3}>Total</th>
                    <th>{money(summary.monthly)}</th>
                    <th>{money(data.reduce((total, l) => total + l.totalPayable, 0))}</th>
                    <th>{money(summary.paid)}</th>
                    <th>{money(summary.balance)}</th>
                    <th colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {data.map((loan) => (
            <section key={loan.id} className="card loan-report-loan">
              <h2 className="section-title">
                {loan.name} <span className="muted small">{loan.type} {'\u00B7'} {STATUS_LABELS[loan.status]}</span>
              </h2>
              <p className="muted small loan-facts">
                <span>Borrowed {money(loan.amount)}</span>
                <span>
                  {money(loan.monthlyAmortization)} x {loan.term} = {money(loan.totalPayable)}
                </span>
                {loan.interest > 0 && <span>Interest {money(loan.interest)}</span>}
                <span>Balance {money(loan.balance)}</span>
              </p>
              <LoanSchedule loan={loan} />
            </section>
          ))}

          <p className="muted small no-print">
            Tip: Save as PDF opens the print screen. On a phone, use its Share or Save to Files option to keep the PDF.
          </p>
        </>
      )}
    </div>
  )
}
