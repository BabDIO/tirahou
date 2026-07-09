import { useAuthStore } from '../store/authStore'
import { hasPermission, canAccessRoute } from '../utils/roleConfig'

export function usePermissions() {
  const { user } = useAuthStore()

  return {
    canEditGrades: hasPermission(user?.role || '', 'canEditGrades'),
    canValidateGrades: hasPermission(user?.role || '', 'canValidateGrades'),
    canPublishResults: hasPermission(user?.role || '', 'canPublishResults'),
    canManagePayments: hasPermission(user?.role || '', 'canManagePayments'),
    canManageLibrary: hasPermission(user?.role || '', 'canManageLibrary'),
    canManageUsers: hasPermission(user?.role || '', 'canManageUsers'),
    canAccessRoute: (route: string) => canAccessRoute(user?.role || '', route),
    userRole: user?.role
  }
}
