# 🔍 DIAGNOSTIC COMPLET SYSTÈME TIRAHOU

**Date**: 09/07/2026  
**Statut**: 7 tests E2E échoués / 9 total

---

## 📊 RÉSUMÉ EXÉCUTIF

### ✅ Ce qui fonctionne
- Backend Django démarré et accessible (port 8000)
- Frontend React démarré et accessible (port 3000)
- API `/auth/login/` répond 200 OK avec tokens JWT valides
- Authentification par email configurée (`EmailBackend`)
- Serializer JWT retourne `{access, refresh, user}` correctement
- authStore Zustand complet avec `setAuth()` et `refreshToken`
- 2 tests E2E passent : affichage page login, refus mauvais identifiants

### ❌ Ce qui ne fonctionne PAS
- **7 tests de connexion échouent** (admin, student, teacher, scolarite, financier, responsable, bibliothecaire)
- Après login API réussi, redirection vers `/dashboard` mais :
  - **Admin** : Page "Accès refusé - Vous n'avez pas les permissions nécessaires"
  - **Autres rôles** : Page blanche / vide (pas de contenu affiché)

---

## 🔴 PROBLÈMES IDENTIFIÉS

### **PROBLÈME #1 : Gestion des permissions/rôles côté frontend**

**Symptôme** :
```
Admin → "Accès refusé" sur /dashboard
Student/Teacher/etc → Page blanche sur /dashboard
```

**Cause probable** :
1. Système RBAC frontend ne reconnaît pas les rôles du backend
2. Routes protégées bloquent l'accès même après authentification réussie
3. Mapping rôles backend ↔ frontend incorrect

**Fichiers à vérifier** :
- `frontend/src/App.tsx` ou routeur principal (routes protégées)
- `frontend/src/pages/dashboard/*.tsx` (vérification permissions)
- `frontend/src/components/ProtectedRoute.tsx` (si existe)
- `frontend/src/hooks/usePermissions.tsx` ou `useAuth.tsx`

**Format des rôles** :
- Backend renvoie : `user.roles = [{id, name: "super_admin", description, is_active}]`
- AuthStore dérive : `user.role = "super_admin"` (premier rôle uniquement)

---

### **PROBLÈME #2 : Backend serializer (résolu mais non redémarré)**

**Statut** : ✅ Code corrigé, mais **redémarrage backend requis**

**Modification effectuée** : `backend/apps/accounts/serializers.py`
```python
class CustomTokenObtainSerializer(TokenObtainPairSerializer):
    username_field = 'email'  # ✅ Connexion par email
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        user = authenticate(request=self.context.get('request'), email=email, password=password)
        # ... retourne {refresh, access, user}
```

**Action requise** : Redémarrer le backend Django
```bash
cd backend
python manage.py runserver
```

---

### **PROBLÈME #3 : Comptes de test manquants**

**Statut** : ⚠️ Partiellement résolu

**Comptes créés** :
- ✅ `admin@tirahou.edu` / `Admin123!`
- ✅ `etudiant@tirahou.edu` / `Etudiant123!`
- ✅ `enseignant@tirahou.edu` / `Enseignant123!`
- ✅ `student097@uvhci.edu` / `1223@Cisse`

**Comptes manquants** (utilisés par tests E2E) :
- ❌ `scolarite@tirahou.edu` / `Scolarite123!`
- ❌ `financier@tirahou.edu` / `Financier123!`
- ❌ `responsable@tirahou.edu` / `Responsable123!`
- ❌ `bibliothecaire@tirahou.edu` / `Biblio123!`

**Action** : Exécuter `backend/create_test_users.py` (s'il contient tous les comptes)

---

## 🧪 RÉSULTATS TESTS E2E

```
✅ devrait afficher la page de connexion
✅ devrait refuser une connexion avec mauvais identifiants
❌ devrait connecter et déconnecter admin (Accès refusé)
❌ devrait connecter et déconnecter student (Page blanche)
❌ devrait connecter et déconnecter teacher (Page blanche)
❌ devrait connecter et déconnecter scolarite (Page blanche)
❌ devrait connecter et déconnecter financier (Page blanche)
❌ devrait connecter et déconnecter responsable (Page blanche)
❌ devrait connecter et déconnecter bibliothecaire (Page blanche)
```

**Timeout** : 15s sur redirection `/dashboard`  
**Erreur** : Page affichée mais contenu vide/refusé

---

## 📝 FLUX D'AUTHENTIFICATION (ACTUEL)

```
┌─────────────┐
│ LoginPage   │
└──────┬──────┘
       │ POST /auth/login/ {email, password}
       ▼
┌─────────────────────────┐
│ Backend Django          │
│ EmailBackend.authenticate│
└──────┬──────────────────┘
       │ HTTP 200 {access, refresh, user}
       ▼
┌─────────────┐
│ authStore   │
│ setAuth()   │
└──────┬──────┘
       │ localStorage.setItem('access_token')
       ▼
┌─────────────┐
│ navigate()  │
│ /dashboard  │
└──────┬──────┘
       │
       ▼
   ❌ ÉCHEC ICI
   - Admin : "Accès refusé"
   - Autres : Page blanche
```

---

## 🔧 PLAN DE CORRECTION

### **P0 - CRITIQUE (À faire maintenant)**

1. **Identifier le système de routing/permissions frontend**
   ```bash
   # Trouver le routeur principal
   grep -r "ProtectedRoute\|PrivateRoute\|<Route" frontend/src/
   
   # Trouver la gestion des permissions
   grep -r "permissions\|hasRole\|canAccess" frontend/src/
   ```

2. **Vérifier la page Dashboard**
   ```bash
   # Lire le composant Dashboard
   cat frontend/src/pages/dashboard/DashboardPage.tsx
   # ou
   cat frontend/src/pages/Dashboard.tsx
   ```

3. **Corriger la logique RBAC**
   - Mapper correctement les rôles backend → frontend
   - Autoriser l'accès au dashboard selon le rôle
   - Afficher le contenu approprié par rôle

### **P1 - IMPORTANT (Après P0)**

4. **Créer tous les comptes de test manquants**
   ```bash
   cd backend
   python create_test_users.py
   ```

5. **Redémarrer le backend**
   ```bash
   cd backend
   python manage.py runserver
   ```

6. **Relancer les tests E2E**
   ```bash
   cd frontend
   npx playwright test e2e/01-auth.spec.ts
   ```

### **P2 - AMÉLIORATION (Après tests OK)**

7. **Ajouter logs de debug**
   - Console.log dans LoginPage après setAuth
   - Console.log dans Dashboard au chargement
   - Console.log dans ProtectedRoute pour voir les vérifications

8. **Améliorer gestion d'erreurs**
   - Parser `non_field_errors` dans LoginPage
   - Afficher messages d'erreur API clairs

---

## 📂 FICHIERS CLÉS

### Backend
- `backend/apps/accounts/backends.py` - EmailBackend ✅
- `backend/apps/accounts/serializers.py` - CustomTokenObtainSerializer ✅
- `backend/apps/accounts/views.py` - LoginView
- `backend/config/settings.py` - AUTHENTICATION_BACKENDS ✅

### Frontend
- `frontend/src/pages/auth/LoginPage.tsx` - Flux de connexion ✅
- `frontend/src/store/authStore.ts` - Gestion état auth ✅
- `frontend/src/App.tsx` - Routeur principal ❓
- `frontend/src/pages/dashboard/*.tsx` - Pages dashboard ❓
- `frontend/src/components/ProtectedRoute.tsx` - Routes protégées ❓

### Tests
- `frontend/e2e/01-auth.spec.ts` - Tests authentification
- `frontend/e2e/helpers/auth.ts` - Helper login
- `frontend/e2e/fixtures/accounts.ts` - Comptes de test

---

## 🎯 PROCHAINE ÉTAPE IMMÉDIATE

**Trouver pourquoi le dashboard affiche "Accès refusé" ou page blanche**

```bash
# 1. Lire le routeur principal
cat frontend/src/App.tsx

# 2. Lire le composant Dashboard
find frontend/src -name "*Dashboard*" -type f

# 3. Chercher les vérifications de permissions
grep -r "Accès refusé\|Access denied\|Unauthorized" frontend/src/
```

---

## 📞 COMMANDES UTILES

```bash
# Backend
cd backend && python manage.py runserver
cd backend && python check_users.py
cd backend && python create_test_users.py

# Frontend
cd frontend && npm run dev
cd frontend && npx playwright test e2e/01-auth.spec.ts
cd frontend && npx playwright show-report

# Test API manuel
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@tirahou.edu", "password": "Admin123!"}'
```

---

**Dernière mise à jour** : 09/07/2026 - Tests lancés, problème RBAC/routing identifié
