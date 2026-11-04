import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminRoute, ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { Background } from './components/Background'
import { LoadingState } from './components/States'
import { useServiceWorkerNavigation } from './lib/serviceWorker'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import ProjectsHubPage from './pages/ProjectsHubPage'

// lazy() = code splitting. The payment tracker (and its chart library) is only
// downloaded the first time you open it, so the login page stays fast.
const PaymentTrackerApp = lazy(() => import('./projects/payment-tracker/PaymentTrackerApp'))
const BudgetApp = lazy(() => import('./projects/budget/BudgetApp'))
const RemindersApp = lazy(() => import('./projects/reminders/RemindersApp'))
const SavingsApp = lazy(() => import('./projects/savings/SavingsApp'))
const HabitsApp = lazy(() => import('./projects/habits/HabitsApp'))
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))

export default function App() {
  useServiceWorkerNavigation()

  return (
    <>
      <Background />
      <Suspense fallback={<LoadingState label="Loading module…" />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route path="/projects" element={<ProjectsHubPage />} />
              <Route path="/projects/payment-tracker/*" element={<PaymentTrackerApp />} />
              <Route path="/projects/budget/*" element={<BudgetApp />} />
              <Route path="/projects/reminders/*" element={<RemindersApp />} />
              <Route path="/projects/savings/*" element={<SavingsApp />} />
              <Route path="/projects/habits/*" element={<HabitsApp />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin/users" element={<AdminUsersPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}