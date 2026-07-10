export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin_institutionnel',
  SCOLARITE: 'admin_scolarite',
  FINANCIER: 'admin_financier',
  RESPONSABLE: 'responsable_pedagogique',
  CHEF_DEPT: 'chef_departement',
  TEACHER: 'enseignant',
  TUTEUR: 'tuteur',
  STUDENT: 'etudiant',
  DOCTORANT: 'doctorant',
  BIBLIOTHECAIRE: 'bibliothecaire'
}

export const rolePermissions = {
  [ROLES.SUPER_ADMIN]: {
    canViewGrades: true,
    canEditGrades: true,
    canValidateGrades: true,
    canPublishResults: true,
    canManagePayments: true,
    canManageLibrary: true,
    canManageUsers: true,
    dashboard: '/dashboard',
    allowedRoutes: ['*']
  },
  [ROLES.CHEF_DEPT]: {
    canViewGrades: true,
    canEditGrades: false,
    canValidateGrades: true,
    canPublishResults: false,
    canManagePayments: false,
    canManageLibrary: false,
    canManageUsers: false,
    dashboard: '/dashboard',
    allowedRoutes: [
      '/dashboard',
      '/responsable/*',
      '/courses',
      '/students',
      '/evaluation',
      '/profile'
    ]
  },
  [ROLES.TUTEUR]: {
    canViewGrades: true,
    canEditGrades: true,
    canValidateGrades: false,
    canPublishResults: false,
    canManagePayments: false,
    canManageLibrary: false,
    canManageUsers: false,
    dashboard: '/dashboard',
    allowedRoutes: [
      '/dashboard',
      '/teacher/*',
      '/courses',
      '/students',
      '/virtual-classes',
      '/profile'
    ]
  },
  [ROLES.DOCTORANT]: {
    canViewGrades: true,
    canEditGrades: false,
    canValidateGrades: false,
    canPublishResults: false,
    canManagePayments: false,
    canManageLibrary: false,
    canManageUsers: false,
    dashboard: '/dashboard',
    allowedRoutes: [
      '/dashboard',
      '/student/*',
      '/courses',
      '/virtual-classes',
      '/library',
      '/profile'
    ]
  },
  [ROLES.STUDENT]: {
    canViewGrades: true,
    canEditGrades: false,
    canValidateGrades: false,
    canPublishResults: false,
    canManagePayments: false,
    canManageLibrary: false,
    canManageUsers: false,
    dashboard: '/dashboard/student',
    allowedRoutes: [
      '/dashboard',
      '/student/*',
      '/courses',
      '/virtual-classes',
      '/library',
      '/profile'
    ]
  },
  [ROLES.TEACHER]: {
    canViewGrades: true,
    canEditGrades: true,
    canValidateGrades: false,
    canPublishResults: false,
    canManagePayments: false,
    canManageLibrary: false,
    canManageUsers: false,
    dashboard: '/dashboard/teacher',
    allowedRoutes: [
      '/dashboard',
      '/teacher/*',
      '/courses',
      '/students',
      '/virtual-classes',
      '/profile'
    ]
  },
  [ROLES.RESPONSABLE]: {
    canViewGrades: true,
    canEditGrades: false,
    canValidateGrades: true,
    canPublishResults: false,
    canManagePayments: false,
    canManageLibrary: false,
    canManageUsers: false,
    dashboard: '/dashboard/responsable',
    allowedRoutes: [
      '/dashboard',
      '/responsable/*',
      '/courses',
      '/students',
      '/evaluation',
      '/profile'
    ]
  },
  [ROLES.SCOLARITE]: {
    canViewGrades: true,
    canEditGrades: false,
    canValidateGrades: true,
    canPublishResults: true,
    canManagePayments: false,
    canManageLibrary: false,
    canManageUsers: true,
    dashboard: '/dashboard/scolarite',
    allowedRoutes: [
      '/dashboard',
      '/scolarite/*',
      '/students',
      '/enrollment',
      '/documents',
      '/evaluation',
      '/profile'
    ]
  },
  [ROLES.FINANCIER]: {
    canViewGrades: false,
    canEditGrades: false,
    canValidateGrades: false,
    canPublishResults: false,
    canManagePayments: true,
    canManageLibrary: false,
    canManageUsers: false,
    dashboard: '/dashboard/financier',
    allowedRoutes: [
      '/dashboard',
      '/financier/*',
      '/finance',
      '/students',
      '/profile'
    ]
  },
  [ROLES.BIBLIOTHECAIRE]: {
    canViewGrades: false,
    canEditGrades: false,
    canValidateGrades: false,
    canPublishResults: false,
    canManagePayments: false,
    canManageLibrary: true,
    canManageUsers: false,
    dashboard: '/dashboard/bibliothecaire',
    allowedRoutes: [
      '/dashboard',
      '/bibliothecaire/*',
      '/library',
      '/profile'
    ]
  },
  [ROLES.ADMIN]: {
    canViewGrades: true,
    canEditGrades: true,
    canValidateGrades: true,
    canPublishResults: true,
    canManagePayments: true,
    canManageLibrary: true,
    canManageUsers: true,
    dashboard: '/dashboard/admin',
    allowedRoutes: ['*']
  }
}

export const hasPermission = (userRole: string, permission: keyof typeof rolePermissions[keyof typeof rolePermissions]): boolean => {
  const perms = rolePermissions[userRole as keyof typeof rolePermissions]
  if (!perms) return false
  return perms[permission] as boolean
}

export const canAccessRoute = (userRole: string, route: string): boolean => {
  const perms = rolePermissions[userRole as keyof typeof rolePermissions]
  if (!perms) return false
  if (perms.allowedRoutes.includes('*')) return true
  return perms.allowedRoutes.some(allowed => {
    if (allowed.endsWith('/*')) {
      const base = allowed.slice(0, -2)
      return route.startsWith(base)
    }
    return route === allowed || route.startsWith(allowed + '/')
  })
}
