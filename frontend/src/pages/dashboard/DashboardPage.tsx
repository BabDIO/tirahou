import { useAuthStore } from '../../store/authStore'
import { useRole } from '../../hooks/useRole'
import StudentDashboard from './StudentDashboard'
import TeacherDashboard from './TeacherDashboard'
import FinancierDashboardEnriched from './FinancierDashboardEnriched'
import ScolariteDashboard from './ScolariteDashboard'
import BibliothecaireDashboard from './BibliothecaireDashboard'
import ResponsableDashboardEnriched from './ResponsableDashboardEnriched'
import SimpleDashboard from './SimpleDashboard'
import SuperAdminDashboard from './SuperAdminDashboard'

// Version fonctionnelle - utilise les dashboards spécifiques selon le rôle

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { isEtudiant, isEnseignant, isFinancier, isScolarite, isBibliothecaire, isResponsable, isAdmin } = useRole()

  // Super Admin a son propre dashboard
  if (isAdmin) {
    return <SuperAdminDashboard />
  }

  // Router vers le bon dashboard selon le rôle
  if (isEtudiant) return <StudentDashboard />
  if (isEnseignant) return <TeacherDashboard />
  if (isFinancier) return <FinancierDashboardEnriched />
  if (isScolarite) return <ScolariteDashboard />
  if (isBibliothecaire) return <BibliothecaireDashboard />
  if (isResponsable) return <ResponsableDashboardEnriched />

  // Fallback: dashboard simplifié pour autres rôles
  return <SimpleDashboard />
}

// Fonction AdminDashboard commentée car non utilisée
// Le dashboard par défaut est SimpleDashboard pour éviter les erreurs d'import
