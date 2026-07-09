export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin_institutionnel',
  SCOLARITE: 'admin_scolarite',
  FINANCIER: 'admin_financier',
  RESPONSABLE: 'responsable_pedagogique',
  TEACHER: 'enseignant',
  STUDENT: 'etudiant',
  BIBLIOTHECAIRE: 'bibliothecaire'
}

export const PERMISSIONS = {
  MANAGE_USERS: ['super_admin', 'admin_institutionnel'],
  MANAGE_GRADES: ['enseignant', 'responsable_pedagogique', 'admin_scolarite'],
  VALIDATE_GRADES: ['responsable_pedagogique', 'admin_scolarite'],
  PUBLISH_RESULTS: ['admin_scolarite'],
  MANAGE_PAYMENTS: ['admin_financier'],
  VALIDATE_PAYMENTS: ['admin_financier'],
  MANAGE_LIBRARY: ['bibliothecaire'],
  VIEW_ANALYTICS: ['super_admin', 'admin_institutionnel', 'responsable_pedagogique'],
  VIEW_OWN_GRADES: ['etudiant'],
  ENTER_GRADES: ['enseignant']
}

export const hasPermission = (userRole: string, permission: keyof typeof PERMISSIONS): boolean => {
  const allowedRoles = PERMISSIONS[permission]
  return allowedRoles.includes(userRole)
}

export const canAccessRoute = (userRole: string, route: string): boolean => {
  const routePermissions: Record<string, string[]> = {
    '/admin': ['super_admin', 'admin_institutionnel'],
    '/teacher/grades': ['enseignant'],
    '/responsable/validation': ['responsable_pedagogique'],
    '/scolarite/results': ['admin_scolarite'],
    '/financier/payments': ['admin_financier'],
    '/bibliothecaire': ['bibliothecaire'],
    '/student': ['etudiant']
  }

  for (const [path, roles] of Object.entries(routePermissions)) {
    if (route.startsWith(path)) {
      return roles.includes(userRole)
    }
  }
  return true
}
