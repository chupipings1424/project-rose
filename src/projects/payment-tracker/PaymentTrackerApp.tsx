import { Navigate, Route, Routes } from 'react-router-dom'
import NotFoundPage from '../../pages/NotFoundPage'
import { BUDGET_BASE } from '../budget/paths'
import { WorkbookLayout } from '../workbook/WorkbookLayout'
import '../workbook/workbook.css'
import PaymentsPage from './pages/PaymentsPage'
import ReportPage from './pages/ReportPage'
import { TRACKER_BASE, trackerPaths } from './paths'

const TABS = [
  { to: trackerPaths.payments, label: 'Payments', end: true },
  { to: trackerPaths.report, label: 'Report' },
]

/** Nested routes: these paths are relative to /projects/payment-tracker/ */
export default function PaymentTrackerApp() {
  return (
    <Routes>
      <Route element={<WorkbookLayout eyebrow="Project 01" title="Payment Tracker" tabs={TABS} />}>
        <Route index element={<PaymentsPage />} />
        <Route path="report" element={<ReportPage />} />
        {/* Old bookmarks from before Budget became its own project */}
        <Route path="payments" element={<Navigate to={TRACKER_BASE} replace />} />
        <Route path="budget" element={<Navigate to={BUDGET_BASE} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}