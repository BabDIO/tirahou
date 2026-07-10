# 🔍 DIAGNOSTIC COMPLET - SYSTÈME TIRAHOU

**Date**: 09/07/2026  
**Status**: 7 tests E2E échouent sur l'authentification

---

## 📊 RÉSUMÉ EXÉCUTIF

### Tests E2E (frontend/e2e/01-auth.spec.ts)
- ✅ **2 tests passent** (9.6s + 3.0s)
  - Affichage page de connexion
  - Refus connexion avec mauvais identifiants
  
- ❌ **7 tests échouent** (tous avec même erreur)
  - Connexion admin, student, teacher, scolarite, financier, responsable, bibliothecaire
  - **Erreur commune**: `TimeoutError: page.waitForURL: Timeout 15000ms exceeded`
  - **URL attendue**: `/dashboard`
  - **URL actuelle**: reste sur `/login`

### Verdict
L'utilisateur se connecte (backend répond 200 OK) mais **reste bloqué sur `/login`** au lieu d'être redirigé vers `/dashboard`.

---

## 🔴 PROBLÈMES PAR ORDRE DE CRITICITÉ

### 1. ⚠️ **FLUX AUTHENTIFICATION FRONTEND** (P0 - BLOQUANT)

#### Symptôme
Après un login API réussi (200 OK avec tokens JWT), la redirection vers `/dashboard` ne se produit jamais.

#### Investigation

**Backend ✅ FONCTIONNE**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@tirahou.edu", "password": "Admin123!"}'

# Réponse 200 OK
{
  "access": "eyJhbG...",
  "refresh": "eyJhbG...",
  "user": {
    "id": "0a02bd40-4579-4f34-814d-ae188fb8220f",
    "email": "admin@tirahou.edu",
    "first_name": "Kouassi",
    "last_name": "ADMIN",
    "roles": [{"name": "super_admin", ...}],
    "is_active": true
  }
}
```

**authStore ✅ FONCTIONNE**
```typescript
// frontend/src/store/authStore.ts
interface AuthStore {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null        // ✅ Présent
  isAuthenticated: boolean
  setAuth: (user, access, refresh) => void  // ✅ Présent
  logout: () => void
  updateUser: (user: Partial<AuthUser>) => void
}
```

**LoginPage ✅ CODE CORRECT**
```typescript
// frontend/src/pages/auth/LoginPage.tsx (lignes 47-56)
const onSubmit = async (data: FormData) => {
  setServerError('')
  try {
    const res = await authApi.login(data)
    const { access, refresh, user } = res.data  // ✅ Destructure OK
    const { setAuth } = useAuthStore.getState()
    setAuth(user, access, refresh)              // ✅ Appel OK
    navigate('/dashboard')                       // ❌ N'est jamais atteint
  } catch (err: unknown) {
    // Gestion erreurs...
```

#### Hypothèses possibles

**A. Erreur silencieuse dans `setAuth()`**
- Le `setAuth` lève une exception qui n'est pas catchée
- La déstructuration `const { access, refresh, user } = res.data` échoue

**B. Problème de navigation React Router**
- Le `navigate('/dashboard')` est appelé mais la route n'existe pas
- Un guard de route bloque l'accès

**C. Problème réseau/CORS**
- La requête ne part jamais vraiment
- La réponse est interceptée par axios et modifiée

#### Tests à effectuer

1. **Ajouter des console.log dans LoginPage**
```typescript
const onSubmit = async (data: FormData) => {
  console.log('🔵 Début login', data)
  try {
    const res = await authApi.login(data)
    console.log('🟢 Réponse API reçue', res.data)
    
    const { access, refresh, user } = res.data
    console.log('🟡 Données extraites', { access, refresh, user })
    
    const { setAuth } = useAuthStore.getState()
    console.log('🟣 setAuth récupéré')
    
    setAuth(user, access, refresh)
    console.log('🔵 setAuth appelé avec succès')
    
    navigate('/dashboard')
    console.log('✅ Navigation lancée')
  } catch (err) {
    console.error('❌ Erreur login', err)
    // ...
```

2. **Vérifier les routes React Router**
```bash
# Chercher la définition de /dashboard
grep -r "path.*dashboard" frontend/src/
```

3. **Tester connexion manuelle dans DevTools console**
```javascript
// Dans la console du navigateur sur http://localhost:3000/login
fetch('http://localhost:8000/api/v1/auth/login/', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'admin@tirahou.edu', password: 'Admin123!'})
})
.then(r => r.json())
.then(d => console.log(d))
```

#### Fix recommandé

**Option 1: Ordre d'exécution (suspicion principale)**

Le problème pourrait venir de l'ordre des opérations. Le token doit être en localStorage **avant** l'appel `/auth/me/`:

```typescript
// ACTUEL (peut causer problème)
const res = await authApi.login(data)
const { access, refresh, user } = res.data
const { setAuth } = useAuthStore.getState()
setAuth(user, access, refresh)  // Stock dans Zustand + localStorage
navigate('/dashboard')

// CORRIGÉ
const res = await authApi.login(data)
const { access, refresh, user } = res.data

// 1. Stocker le token IMMÉDIATEMENT
localStorage.setItem('access_token', access)
localStorage.setItem('refresh_token', refresh)

// 2. Mettre à jour le store
const { setAuth } = useAuthStore.getState()
setAuth(user, access, refresh)

// 3. Naviguer
navigate('/dashboard')
```

**Option 2: Attendre la mise à jour du store**

```typescript
const res = await authApi.login(data)
const { access, refresh, user } = res.data
const { setAuth } = useAuthStore.getState()

// Attendre que le store soit mis à jour
await new Promise(resolve => {
  setAuth(user, access, refresh)
  setTimeout(resolve, 100)  // Laisser Zustand persister
})

navigate('/dashboard')
```

---

### 2. 🟡 **GESTION DES ERREURS LOGIN** (P1)

#### Problème
Le backend renvoie les erreurs dans `non_field_errors`, mais le frontend cherche seulement `detail` et `message`.

**Backend** (CustomTokenObtainSerializer)
```python
raise serializers.ValidationError(
    "Aucun compte actif n'a été trouvé avec les identifiants fournis"
)
# Produit: {"non_field_errors": ["Aucun compte actif..."]}
```

**Frontend** (LoginPage.tsx lignes 62-68)
```typescript
const body = e.response?.data
if (s === 401 || s === 400) {
  setServerError('Email ou mot de passe incorrect.')
}
// ❌ N'affiche pas le vrai message du backend
```

#### Fix
```typescript
const body = e.response?.data
if (s === 401 || s === 400) {
  // Parser tous les formats possibles
  const msg = body?.detail 
    || body?.message 
    || body?.non_field_errors?.[0]
    || 'Email ou mot de passe incorrect.'
  setServerError(msg)
}
```

---

### 3. 🟢 **CONFIGURATION SYSTÈME** (P2 - INFO)

#### Environnement
- **OS**: Windows
- **Shell**: PowerShell
- **Backend**: Django 4.x sur port 8000
- **Frontend**: React 18 + Vite sur port 3000
- **Base de données**: SQLite (development)

#### Comptes de test disponibles

| Rôle | Email | Password | Status |
|------|-------|----------|--------|
| Super Admin | admin@tirahou.edu | Admin123! | ✅ Vérifié |
| Étudiant | etudiant@tirahou.edu | Etudiant123! | ✅ Vérifié |
| Enseignant | enseignant@tirahou.edu | Enseignant123! | ✅ Vérifié |
| Étudiant test | student097@uvhci.edu | 1223@Cisse | ✅ Créé manuellement |

#### Configuration authentification backend

**settings.py**
```python
AUTH_USER_MODEL = 'accounts.User'

AUTHENTICATION_BACKENDS = [
    'apps.accounts.backends.EmailBackend',  # ✅ Connexion par email
    'django.contrib.auth.backends.ModelBackend',  # Fallback
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

**backends.py** (✅ FONCTIONNE)
```python
class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        email = kwargs.get('email', username)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None
        
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
```

**serializers.py** (✅ MODIFIÉ RÉCEMMENT)
```python
class CustomTokenObtainSerializer(TokenObtainPairSerializer):
    username_field = 'email'  # ✅ Utilise email au lieu de username
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        user = authenticate(request=self.context.get('request'),
                          email=email, password=password)
        if not user:
            raise serializers.ValidationError(
                "Aucun compte actif n'a été trouvé avec les identifiants fournis"
            )
        refresh = self.get_token(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data,  # ✅ Inclut user
        }
```

---

### 4. 🟢 **TESTS E2E** (P2 - INFO)

#### Framework
- **Outil**: Playwright
- **Config**: `frontend/playwright.config.ts`
- **Tests**: `frontend/e2e/01-auth.spec.ts`
- **Helpers**: `frontend/e2e/helpers/auth.ts`

#### Statistiques (09/07/2026)
```
Total:    9 tests
Passés:   2 (22%)
Échoués:  7 (78%)
Durée:    4.6 minutes
```

#### Helpers auth.ts (ligne 29 - point de défaillance)
```typescript
export async function login(page: Page, account: TestAccount) {
  await page.goto('http://localhost:3000/login')
  await page.waitForSelector('input[type="email"]')
  
  await page.fill('input[type="email"]', account.email)
  await page.fill('input[type="password"]', account.password)
  await page.click('button[type="submit"]')
  
  // ❌ ÉCHEC ICI - Timeout après 15s
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  
  await expect(page.locator('body')).toContainText(account.name, { timeout: 5000 });
}
```

#### Traces disponibles
```
test-results\01-auth-🔐-Authentificatio-...-chromium-retry1\trace.zip
test-results\01-auth-🔐-Authentificatio-...-chromium\video.webm
test-results\01-auth-🔐-Authentificatio-...-chromium\test-failed-1.png
```

**Commande pour inspecter**:
```bash
npx playwright show-trace test-results/.../trace.zip
```

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Phase 1: Diagnostic (5 min)
1. Ajouter `console.log` dans `LoginPage.onSubmit`
2. Ouvrir DevTools Network tab
3. Tenter connexion avec `admin@tirahou.edu` / `Admin123!`
4. Noter à quelle étape ça bloque

### Phase 2: Fix rapide (10 min)
1. Corriger l'ordre: localStorage → store → navigate
2. Ajouter parsing `non_field_errors`
3. Tester manuellement sur navigateur

### Phase 3: Validation (15 min)
1. Relancer tests E2E auth: `npm run test:e2e -- e2e/01-auth.spec.ts`
2. Vérifier que les 7 tests passent
3. Committer les corrections

---

## 📝 FICHIERS CONCERNÉS

### À modifier (P0)
- `frontend/src/pages/auth/LoginPage.tsx` (lignes 47-70)
- `frontend/src/store/authStore.ts` (déjà OK, juste vérifier)

### À vérifier
- `frontend/src/App.tsx` (routes /dashboard)
- `frontend/src/components/layout/MainLayout.tsx` (guards de route)
- `backend/apps/accounts/serializers.py` (déjà modifié, non commité)

### Utilitaires créés (non committés)
- `backend/create_uvhci_user.py` - Création utilisateur test
- `backend/check_users.py` - Vérification comptes
- `test-login.ps1` - Script test connexion (encodage cassé)

---

## ✅ CE QUI FONCTIONNE DÉJÀ

- ✅ Backend Django répond correctement sur port 8000
- ✅ EmailBackend authentifie par email
- ✅ JWT tokens sont générés et valides
- ✅ CORS autorise localhost:3000
- ✅ CustomTokenObtainSerializer renvoie `{access, refresh, user}`
- ✅ authStore a toutes les méthodes nécessaires
- ✅ Page de login s'affiche correctement
- ✅ Mauvais identifiants sont bien refusés

---

## 🔍 HYPOTHÈSE FINALE

**Le problème est probablement dans l'ordre d'exécution asynchrone**:

1. `authApi.login()` retourne la réponse
2. `setAuth()` est appelé → déclenche mise à jour Zustand
3. Zustand persist middleware écrit dans localStorage (asynchrone)
4. `navigate('/dashboard')` est appelé AVANT que persist termine
5. Le composant Dashboard se charge
6. Il vérifie `localStorage.getItem('access_token')`
7. Le token n'est pas encore écrit → redirection vers `/login`
8. Boucle infinie ou blocage

**Solution**: Assurer que `localStorage.setItem()` est fait **de manière synchrone** avant `navigate()`.

---

## 📚 DOCUMENTATION EXISTANTE

- `docs/SYNTHESE_ANALYSE_PROJET.md` - 94.2% conformité cahier des charges
- `TESTS_E2E_GUIDE.md` - Guide complet tests Playwright
- `COMPTES_TEST.md` - Liste des comptes de démonstration
- `AMELIORATIONS_IMPLEMENTEES.md` - Historique des corrections

---

**Prochaine étape**: Corriger `LoginPage.tsx` selon le fix recommandé ci-dessus.
