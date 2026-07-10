import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

interface ProtectedRouteProps {
  allowedRoles?: string[]
  requiredRole?: string
}

/**
 * Autorise l'accès si l'utilisateur est authentifié et, le cas échéant, possède
 * le(s) rôle(s) requis. Sans `allowedRoles`/`requiredRole`, la route est ouverte
 * à tout utilisateur connecté (ex: /dashboard, /profile, /communication) — la
 * restriction fine par rôle est déclarée route par route dans App.tsx.
 */
export default function ProtectedRoute({ allowedRoles, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuthStore()
  const location = useLocation()
  const userRoles = user?.roles?.map((r) => r.name) ?? (user?.role ? [user.role] : [])

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />
  }

  if (allowedRoles?.length) {
    const hasRole = userRoles.some((r) => allowedRoles.includes(r))
    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <Outlet />
}
