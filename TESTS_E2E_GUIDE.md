# 🧪 GUIDE DES TESTS E2E AUTOMATISÉS - TIRAHOU

## 📋 Vue d'ensemble

Ce système de tests End-to-End (E2E) automatise **entièrement** le test de l'application TIRAHOU comme un vrai utilisateur, sans aucune intervention manuelle.

### ✨ Ce qui est testé automatiquement

- ✅ Connexion/déconnexion pour tous les rôles (7 comptes)
- ✅ Navigation dans l'application
- ✅ Consultation des notes (étudiant)
- ✅ Saisie des notes (enseignant)
- ✅ Gestion administrative
- ✅ Recherche globale (Ctrl+K)
- ✅ Centre de notifications
- ✅ Changement de thème
- ✅ Responsive mobile/desktop
- ✅ Permissions par rôle

### 🎯 Résultats générés

- **Rapport HTML** interactif avec détails de chaque test
- **Captures d'écran** de toutes les pages importantes
- **Vidéos** des tests qui échouent
- **Traces** pour debug avancé
- **JSON** des résultats pour intégration CI/CD

---

## 🚀 Méthode 1 : Script PowerShell tout-en-un (RECOMMANDÉ)

Cette méthode lance **automatiquement** :
1. Backend Django
2. Frontend React
3. Tous les tests Playwright
4. Génération du rapport
5. Arrêt des serveurs

### Commande unique

```powershell
.\run-full-tests.ps1
```

**C'est tout !** Le script s'occupe de tout et ouvre le rapport automatiquement à la fin.

---

## 🔧 Méthode 2 : Exécution manuelle (3 terminaux)

Si vous préférez contrôler chaque étape :

### Terminal 1 : Backend
```bash
cd backend
python manage.py runserver
```

### Terminal 2 : Frontend
```bash
cd frontend
npm run dev
```

### Terminal 3 : Tests Playwright
```bash
cd frontend
npm run test:e2e
```

---

## 📊 Commandes de test disponibles

### Tests de base

```bash
# Lancer tous les tests
npm run test:e2e

# Lancer avec interface graphique (debug)
npm run test:e2e:ui

# Lancer avec navigateur visible
npm run test:e2e:headed

# Afficher le dernier rapport
npm run test:e2e:report
```

### Tests avancés

```bash
# Tester un seul fichier
npx playwright test 01-auth.spec.ts

# Tester avec un seul worker (séquentiel)
npx playwright test --workers=1

# Tester un rôle spécifique
npx playwright test -g "Étudiant"

# Mode debug (pause sur chaque étape)
npx playwright test --debug

# Générer des tests automatiquement (enregistrement)
npm run test:e2e:codegen
```

---

## 📁 Structure des tests

```
frontend/
├── e2e/
│   ├── fixtures/
│   │   └── accounts.ts          # Comptes de test
│   ├── helpers/
│   │   ├── auth.ts              # Helpers connexion/déconnexion
│   │   └── navigation.ts        # Helpers navigation
│   ├── 01-auth.spec.ts          # Tests authentification
│   ├── 02-student.spec.ts       # Tests étudiant
│   ├── 03-teacher.spec.ts       # Tests enseignant
│   ├── 04-admin.spec.ts         # Tests administrateur
│   └── 05-ui.spec.ts            # Tests interface
├── playwright.config.ts         # Configuration Playwright
├── playwright-report/           # Rapport HTML (généré)
│   ├── index.html
│   └── screenshots/
└── test-results/                # Vidéos et traces (généré)
```

---

## 🎬 Scénarios de test

### 🔐 01 - Authentification (01-auth.spec.ts)
- Page de connexion s'affiche
- Refus avec mauvais identifiants
- **Connexion réussie pour 7 rôles** :
  - Admin
  - Étudiant
  - Enseignant
  - Scolarité
  - Financier
  - Responsable pédagogique
  - Bibliothécaire
- Déconnexion pour chaque rôle

### 👨‍🎓 02 - Étudiant (02-student.spec.ts)
- Dashboard étudiant
- Consultation des notes
- Emploi du temps
- Absences
- Finances
- Documents
- **Test de permission** : ne peut PAS accéder à la saisie des notes

### 👨‍🏫 03 - Enseignant (03-teacher.spec.ts)
- Dashboard enseignant
- Accès à la saisie des notes
- Sélection EC et session
- Liste des cours

### 🔐 04 - Administrateur (04-admin.spec.ts)
- Dashboard admin avec statistiques
- Gestion des utilisateurs
- Recherche d'utilisateur

### 🎨 05 - Interface (05-ui.spec.ts)
- Recherche globale (Ctrl+K)
- Résultats de recherche
- Centre de notifications
- Changement de thème (clair/sombre)
- Menu utilisateur
- Responsive mobile

---

## 📸 Captures d'écran automatiques

Toutes les captures sont dans `playwright-report/screenshots/` :

```
admin-dashboard.png
admin-home.png
admin-users-search.png
admin-users.png
student-attendance.png
student-dashboard.png
student-documents.png
student-finance.png
student-grades.png
student-home.png
student-schedule.png
teacher-courses.png
teacher-dashboard.png
teacher-grades-entry.png
teacher-grades-table.png
teacher-home.png
ui-global-search.png
ui-mobile.png
ui-notifications.png
ui-search-results.png
ui-theme-dark.png
ui-theme-light.png
ui-user-menu.png
```

---

## 🎥 Vidéos des tests

Les vidéos sont générées **uniquement pour les tests qui échouent** dans `test-results/`.

Pour forcer l'enregistrement de toutes les vidéos :

```typescript
// Dans playwright.config.ts
video: 'on'  // au lieu de 'retain-on-failure'
```

---

## 🐛 Debugging

### Mode UI (Interface graphique)

```bash
npm run test:e2e:ui
```

Interface interactive pour :
- Voir les tests en temps réel
- Rejouer les tests
- Explorer les traces
- Voir les screenshots

### Mode Debug (Pas-à-pas)

```bash
npx playwright test --debug
```

Ouvre le **Playwright Inspector** pour exécuter ligne par ligne.

### Traces

Les traces sont automatiques en cas d'échec. Pour les voir :

```bash
npx playwright show-trace test-results/[nom-du-test]/trace.zip
```

---

## 🔄 Intégration CI/CD

### GitHub Actions

Créer `.github/workflows/e2e.yml` :

```yaml
name: Tests E2E

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd backend && pip install -r requirements.txt
          cd ../frontend && npm install
      
      - name: Install Playwright
        run: |
          cd frontend
          npx playwright install --with-deps
      
      - name: Run E2E tests
        run: |
          cd backend && python manage.py runserver &
          cd frontend && npm run dev &
          sleep 15
          npm run test:e2e
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

---

## 📈 Métriques de qualité

Les tests E2E permettent de mesurer :

- **Taux de réussite** : % de tests qui passent
- **Temps d'exécution** : Durée totale des tests
- **Couverture fonctionnelle** : Nombre de features testées
- **Régression** : Comparaison entre versions

---

## 🛠️ Personnalisation

### Ajouter un nouveau test

Créer `frontend/e2e/06-mon-test.spec.ts` :

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Mon module', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });
  
  test('devrait faire quelque chose', async ({ page }) => {
    // Votre test ici
    await page.goto('/ma-page');
    await expect(page.locator('h1')).toContainText('Mon titre');
  });
  
});
```

### Modifier les timeouts

Dans `playwright.config.ts` :

```typescript
timeout: 180_000,  // 3 minutes par test
expect: { timeout: 15_000 },  // 15 secondes par assertion
```

### Ajouter un navigateur

Dans `playwright.config.ts` :

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
],
```

---

## ❓ FAQ

### Les tests échouent avec "Timeout"

- Augmenter les timeouts dans `playwright.config.ts`
- Vérifier que backend et frontend sont bien lancés
- Attendre plus longtemps avant de lancer les tests

### "Failed to resolve import"

- Vérifier que tous les composants existent
- Rebuild le frontend : `npm run build`

### Les captures d'écran sont vides

- Les tests s'exécutent trop vite
- Ajouter `await page.waitForTimeout(1000)` avant screenshot

### Je veux tester en production

Modifier `baseURL` dans `playwright.config.ts` :

```typescript
baseURL: 'https://tirahou-production.com'
```

---

## 📚 Ressources

- [Documentation Playwright](https://playwright.dev)
- [Best Practices E2E](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

## ✅ Checklist avant soutenance

- [ ] Tous les tests passent (100%)
- [ ] Rapport HTML généré
- [ ] Captures d'écran de toutes les pages
- [ ] Vidéo de démo prête
- [ ] Temps d'exécution < 5 minutes
- [ ] Tests documentés
- [ ] Comptes de test fonctionnels

---

**Date** : Juillet 2026  
**Version** : 1.0.0  
**Statut** : ✅ PRÊT POUR PRODUCTION
