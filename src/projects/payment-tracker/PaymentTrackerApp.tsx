import { Route, Routes } from 'react-router-dom'
import NotFoundPage from '../../pages/NotFoundPage'
import { TrackerLayout } from './TrackerLayout'
import BudgetPage from './pages/BudgetPage'
import OverviewPage from './pages/OverviewPage'
import PaymentsPage from './pages/PaymentsPage'
import ReportPage from './pages/ReportPage'
import './tracker.css'

/** Nested routes: these paths are relative to /projects/payment-tracker/ */
export default function PaymentTrackerApp() {
  return (
    <Routes>
      <Route element={<TrackerLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}