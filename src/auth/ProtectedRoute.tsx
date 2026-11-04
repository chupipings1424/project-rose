import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

export const CHANGE_PASSWORD_PATH = '/change-password'

/**
 * A "layout route": every route nested inside it is only reachable when logged in.
 * Otherwise we redirect to /login and remember where the user was heading.
 * Someone still on a temporary password is sent to choose their own first.
 */
export function ProtectedRoute() {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (session.mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }
  return <Outlet />
}

/** Only admins get past this; everybody else lands on the projects page. */
export function AdminRoute() {
  const { session } = useAuth()
  return session?.isAdmin ? <Outlet /> : <Navigate to="/projects" replace />
}