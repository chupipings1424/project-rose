import { Route, Routes } from 'react-router-dom'
import NotFoundPage from '../../pages/NotFoundPage'
import LoanReportPage from './pages/LoanReportPage'
import LoansPage from './pages/LoansPage'
import './loans.css'

/** Nested routes: these paths are relative to /projects/loans/ */
export default function LoansApp() {
  return (
    <Routes>
      <Route index element={<LoansPage />} />
      <Route path="report" element={<LoanReportPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
