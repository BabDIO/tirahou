# 🎯 SOLUTION PROBLÈME AUTHENTIFICATION TIRAHOU

**Date**: 09/07/2026  
**Problème**: 7 tests E2E échouent - Page "Accès refusé" ou blanche après connexion

---

## 🔍 CAUSE RACINE IDENTIFIÉE

### **Le backend renvoie des rôles non reconnus par le frontend**

**Backend** (`backend/apps/accounts/models.py`) :
```python
# Rôles existants dans la base de données
- super_admin ❌ NON RECONNU
- admin_institutionnel ✅
- admin_scolarite ✅
- admin_financier ✅
- responsable_pedagogique ✅
- chef_departement ❌ NON RECONNU
- enseignant ✅
- tuteur ❌ NON RECONNU
- etudiant ✅
- doctorant ❌ NON RECONNU
- bibliothecaire ✅
```

**Frontend** (`frontend/src/utils/roleConfig.ts`) :
```typescript
export const ROLES = {
  STUDENT: 'etudiant',           ✅
  TEACHER: 'enseignant',         ✅
  ADMIN: 'admin_institutionnel', ✅
  SCOLARITE: 'admin_scolarite',  ✅
  FINANCIER: 'admin_financier',  ✅
  RESPONSABLE: 'responsable_pedagogique', ✅
  BIBLIOTHECAIRE: 'bibliothecaire' ✅
}
// MANQUANTS: super_admin, chef_departement, tuteur, doctorant
```

---

## 🛠️ SOLUTION

### **Option 1 : Ajouter les rôles manquants dans roleConfig.ts (RECOMMANDÉ)**

```typescript
// frontend/src/utils/roleConfig.ts

export const ROLES = {
  SUPER_ADMIN: 'super_admin',    // ← AJOUT
  ADMIN: 'admin_institutionnel',
  SCOLARITE: 'admin_scolarite',
  FINANCIER: 'admin_financier',
  RESPONSABLE: 'responsable_pedagogique',
  CHEF_DEPT: 'chef_departement', // ← AJOUT
  TEACHER: 'enseignant',
  TUTEUR: 'tuteur',              // ← AJOUT
  STUDENT: 'etudiant',
  DOCTORANT: 'doctorant',        // ← AJOUT
  BIBLIOTHECAIRE: 'bibliothecaire'
}

export const rolePermissions = {
  // AJOUTER super_admin avec permissions maximales
  [ROLES.SUPER_ADMIN]: {
    canViewGrades: true,
    canEditGrades: true,
    canValidateGrades: true,
    canPublishResults: true,
    canManagePayments: true,
    canManageLibrary: true,
    canManageUsers: true,
    dashboard: '/dashboard',
    allowedRoutes: ['*']  // Accès total
  },
  
  // AJOUTER chef_departement (similaire à responsable_pedagogique)
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
  
  // AJOUTER tuteur (similaire à enseignant)
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
  
  // AJOUTER doctorant (similaire à etudiant)
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
  
  // Garder les existants...
  [ROLES.STUDENT]: { /* ... */ },
  [ROLES.TEACHER]: { /* ... */ },
  // etc.
}
```

---

### **Option 2 : Mapper super_admin → admin_institutionnel dans authStore (RAPIDE)**

```typescript
// frontend/src/store/authStore.ts

function derivePrimaryRole(user: ApiUser): string {
  const firstRole = user.roles?.[0]?.name ?? ''
  
  // Mapper super_admin vers admin_institutionnel pour compatibilité
  if (firstRole === 'super_admin') {
    return 'admin_institutionnel'
  }
  
  return firstRole
}
```

---

## ✅ PLAN D'IMPLÉMENTATION

### **Phase 1 : Correction immédiate (5 min)**

1. **Ajouter super_admin dans roleConfig.ts**
   ```bash
   # Éditer
   frontend/src/utils/roleConfig.ts
   ```

2. **Ajouter chef_departement, tuteur, doctorant**

3. **Relancer les tests**
   ```bash
   cd frontend
   npx playwright test e2e/01-auth.spec.ts
   ```

### **Phase 2 : Vérification des comptes (2 min)**

4. **Vérifier les comptes de test dans la BDD**
   ```bash
   cd backend
   python check_users.py
   ```

5. **Créer les comptes manquants si nécessaire**
   ```bash
   python create_test_users.py
   ```

### **Phase 3 : Tests finaux (3 min)**

6. **Relancer tous les tests E2E**
   ```bash
   cd frontend
   npx playwright test
   ```

7. **Tester manuellement la connexion**
   - Ouvrir http://localhost:3000/login
   - Se connecter avec `admin@tirahou.edu` / `Admin123!`
   - Vérifier redirection vers `/dashboard`
   - Vérifier contenu affiché

---

## 🎯 CODE À MODIFIER

### **Fichier unique à modifier** : `frontend/src/utils/roleConfig.ts`

```typescript
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
    allowedRoutes: ['/dashboard', '/responsable/*', '/courses', '/students', '/evaluation', '/profile']
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
    allowedRoutes: ['/dashboard', '/teacher/*', '/courses', '/students', '/virtual-classes', '/profile']
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
    allowedRoutes: ['/dashboard', '/student/*', '/courses', '/virtual-classes', '/library', '/profile']
  },
  
  // CONSERVER LES EXISTANTS
  [ROLES.STUDENT]: { /* existant */ },
  [ROLES.TEACHER]: { /* existant */ },
  [ROLES.ADMIN]: { /* existant */ },
  [ROLES.SCOLARITE]: { /* existant */ },
  [ROLES.FINANCIER]: { /* existant */ },
  [ROLES.RESPONSABLE]: { /* existant */ },
  [ROLES.BIBLIOTHECAIRE]: { /* existant */ }
}
```

---

## 📝 RÉCAPITULATIF

| Problème | Cause | Solution |
|----------|-------|----------|
| Admin → "Accès refusé" | Rôle `super_admin` non reconnu | Ajouter dans `roleConfig.ts` |
| Student/Teacher → Page blanche | Rôles incomplets dans config | Ajouter rôles manquants |
| Tests E2E échouent | Mapping backend/frontend cassé | Compléter `rolePermissions` |

---

**Temps estimé** : 10 minutes  
**Difficulté** : Facile  
**Priorité** : CRITIQUE (P0)

---

**Prochaine étape** : Modifier `frontend/src/utils/roleConfig.ts` immédiatement
