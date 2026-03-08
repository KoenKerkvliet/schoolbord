import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ requiredRoles = null }) {
  const { isAuthenticated, loading, userRole, isSuperAdmin } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-gray-600">Laden...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check role requirements if specified
  if (requiredRoles && !isSuperAdmin) {
    const hasRequiredRole = requiredRoles.includes(userRole)
    if (!hasRequiredRole) {
      return <Navigate to="/frontend" replace />
    }
  }

  return <Outlet />
}
