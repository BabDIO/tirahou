import { useAuthStore } from '../store/authStore'
import StudentDashboard from './dashboard/StudentDashboard'
import TeacherDashboard from './dashboard/TeacherDashboard'
import AdminDashboard from './dashboard/AdminDashboard'
import ScolariteDashboard from './dashboard/ScolariteDashboard'
import FinancierDashboard from './dashboard/FinancierDashboard'
import ResponsableDashboard from './dashboard/ResponsableDashboard'
import BibliothecaireDashboard from './dashboard/BibliothecaireDashboard'
import { ROLES } from '../utils/permissions'

export default function DashboardRouter() {
  const user = useAuthStore(state => state.user)

  if (!user) return null

  const dashboards: Record<string, React.ComponentType> = {
    [ROLES.STUDENT]: StudentDashboard,
    [ROLES.TEACHER]: TeacherDashboard,
    [ROLES.SUPER_ADMIN]: AdminDashboard,
    [ROLES.ADMIN]: AdminDashboard,
    [ROLES.SCOLARITE]: ScolariteDashboard,
    [ROLES.FINANCIER]: FinancierDashboard,
    [ROLES.RESPONSABLE]: ResponsableDashboard,
    [ROLES.BIBLIOTHECAIRE]: BibliothecaireDashboard
  }

  const Dashboard = dashboards[user.role] || StudentDashboard

  return <Dashboard />
}
