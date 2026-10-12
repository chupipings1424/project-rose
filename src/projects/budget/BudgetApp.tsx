import { Route, Routes } from 'react-router-dom'
import NotFoundPage from '../../pages/NotFoundPage'
import { WorkbookLayout } from '../workbook/WorkbookLayout'
import '../workbook/workbook.css'
import BudgetPage from './pages/BudgetPage'
import BudgetReportPage from './pages/BudgetReportPage'
import { budgetPaths } from './paths'

const TABS = [
  { to: budgetPaths.budget, label: 'Budget', end: true },
  { to: budgetPaths.report, label: 'Report' },
]

/** Nested routes: these paths are relative to /projects/budget/ */
export default function BudgetApp() {
  return (
    <Routes>
      <Route element={<WorkbookLayout eyebrow="Project 02" title="Personal Budget" tabs={TABS} />}>
        <Route index element={<BudgetPage />} />
        <Route path="report" element={<BudgetReportPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}