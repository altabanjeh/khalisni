import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadError from '../components/LoadError'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { normalizeRole } from '../utils/format'

function ProtectedRoute({ roles }) {
  const { user, loading, authError, retryAuth } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner />
  // The profile request failed without the session being refused (offline,
  // server fault): keep the session and offer a retry, do not send to login.
  if (!user && authError) {
    return <div className="p-6"><LoadError error={authError} onRetry={retryAuth} /></div>
  }
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
