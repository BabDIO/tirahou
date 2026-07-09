import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { canAccessRoute } from '../../utils/permissions'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
  redirectTo?: string
}

export default function RoleBasedRoute({ children, allowedRoles, redirectTo = '/unauthorized' }: Props) {
  const user = useAuthStore(state => state.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
