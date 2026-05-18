import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { normalizeRole } from '../utils/format'

function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner />
  if (!user) {
    const nextPath = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />
  }

  const userRole = normalizeRole(user.role)
  const allowedRoles = roles?.map(normalizeRole)

  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/" replace />
  return <Outlet />
}

export default ProtectedRoute
