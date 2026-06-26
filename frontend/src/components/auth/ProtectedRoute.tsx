import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useRole, type RoleName } from '../../hooks/useRole'

interface Props {
  allowedRoles?: RoleName[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { isAuthenticated } = useAuthStore()
  const { hasRole } = useRole()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
