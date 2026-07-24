import { useAuthStore } from '../store/authStore'

export type RoleName =
  | 'super_admin'
  | 'admin_institutionnel'
  | 'admin_scolarite'
  | 'admin_financier'
  | 'responsable_pedagogique'
  | 'chef_departement'
  | 'enseignant'
  | 'tuteur'
  | 'etudiant'
  | 'doctorant'
  | 'bibliothecaire'
  | 'invite'
  | 'support_technique'

// Dérive des booléens/flags UI (afficher un bouton, masquer un menu...) à
// partir des rôles de l'utilisateur connecté. Pure commodité côté client —
// aucune de ces valeurs ne doit être traitée comme une autorisation réelle :
// le backend revalide tout indépendamment (get_queryset() filtré par rôle,
// HasModulePermission). Un `can.manageX` à true qui n'a pas d'équivalent
// backend ne fait qu'afficher un bouton qui échouera en 403 au clic.
export function useRole() {
  const { user } = useAuthStore()
  const roles: RoleName[] = (user?.roles?.map(r => r.name) ?? []) as RoleName[]

  const hasRole = (...names: RoleName[]) => names.some(n => roles.includes(n))

  const isAdmin = hasRole('super_admin', 'admin_institutionnel')
  const isScolarite = hasRole('admin_scolarite')
  const isFinancier = hasRole('admin_financier')
  const isEnseignant = hasRole('enseignant', 'tuteur')
  const isEtudiant = hasRole('etudiant', 'doctorant')
  const isResponsable = hasRole('responsable_pedagogique', 'chef_departement')
  const isBibliothecaire = hasRole('bibliothecaire')

  // Accès par module
  const can = {
    // Gestion académique
    manageStudents:    isAdmin || isScolarite,
    manageTeachers:    isAdmin || isScolarite || isResponsable,
    managePrograms:    isAdmin || isResponsable,
    manageAcademic:    isAdmin,
    // Scolarité
    manageAdmissions:  isAdmin || isScolarite,
    manageEnrollment:  isAdmin || isScolarite,
    manageFinance:     isAdmin || isFinancier,
    manageDocuments:   isAdmin || isScolarite,
    // Pédagogie
    manageLMS:         isAdmin || isEnseignant || isResponsable,
    manageEvaluation:  isAdmin || isEnseignant || isScolarite,
    manageAttendance:  isAdmin || isEnseignant || isScolarite,
    manageScheduling:  isAdmin || isScolarite || isResponsable,
    manageVirtualClass:isAdmin || isEnseignant,
    manageInternships: isAdmin || isScolarite || isResponsable,
    // Pilotage
    viewAnalytics:     isAdmin || isResponsable,
    manageCommunication: true, // tous
    manageLibrary:     isAdmin || isBibliothecaire || isEnseignant,
    // Vue étudiant
    viewOwnCourses:    isEtudiant,
    viewOwnGrades:     isEtudiant,
    viewOwnSchedule:   isEtudiant,
    viewOwnDocuments:  isEtudiant,
  }

  return { roles, hasRole, isAdmin, isScolarite, isFinancier, isEnseignant, isEtudiant, isResponsable, isBibliothecaire, can }
}
