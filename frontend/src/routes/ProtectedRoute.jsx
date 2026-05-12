import { Navigate, Outlet } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { normalizeRole } from '../utils/format'

function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />

  const userRole = normalizeRole(user.role)
  const allowedRoles = roles?.map(normalizeRole)

  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/" replace />
  return <Outlet />
}

export default ProtectedRoute
