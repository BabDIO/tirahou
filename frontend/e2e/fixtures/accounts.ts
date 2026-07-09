/**
 * Comptes de test pour E2E
 */

export const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@tirahou.edu',
    password: 'Admin123!',
    role: 'admin_institutionnel',
    name: 'Admin Principal',
  },
  
  student: {
    email: 'etudiant@tirahou.edu',
    password: 'Etudiant123!',
    role: 'etudiant',
    name: 'Jean Dupont',
  },
  
  teacher: {
    email: 'enseignant@tirahou.edu',
    password: 'Enseignant123!',
    role: 'enseignant',
    name: 'Marie Martin',
  },
  
  scolarite: {
    email: 'scolarite@tirahou.edu',
    password: 'Scolarite123!',
    role: 'admin_scolarite',
    name: 'Pierre Bernard',
  },
  
  financier: {
    email: 'financier@tirahou.edu',
    password: 'Financier123!',
    role: 'admin_financier',
    name: 'Sophie Dubois',
  },
  
  responsable: {
    email: 'responsable@tirahou.edu',
    password: 'Responsable123!',
    role: 'responsable_pedagogique',
    name: 'Luc Lambert',
  },
  
  bibliothecaire: {
    email: 'bibliothecaire@tirahou.edu',
    password: 'Biblio123!',
    role: 'bibliothecaire',
    name: 'Anne Durand',
  },
} as const;

export type AccountType = keyof typeof TEST_ACCOUNTS;
