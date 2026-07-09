# 🧪 Tests E2E - TIRAHOU

## 🚀 Lancement rapide

```bash
# Depuis la racine du projet
.\run-full-tests.ps1
```

## 📂 Structure

- `00-health.spec.ts` - Vérifications de santé (backend/frontend OK)
- `01-auth.spec.ts` - Authentification (7 rôles)
- `02-student.spec.ts` - Fonctionnalités étudiant
- `03-teacher.spec.ts` - Fonctionnalités enseignant
- `04-admin.spec.ts` - Fonctionnalités administrateur
- `05-ui.spec.ts` - Interface utilisateur (recherche, thème, notifications)

## 🔧 Helpers

- `helpers/auth.ts` - login(), logout(), verifyDashboard()
- `helpers/navigation.ts` - navigateTo(), globalSearch(), waitForTable()
- `fixtures/accounts.ts` - Comptes de test pour chaque rôle

## 📊 Voir les résultats

```bash
npm run test:e2e:report
```

Ouvre le rapport HTML avec captures d'écran et statistiques.

## 📖 Documentation complète

Voir `TESTS_E2E_GUIDE.md` à la racine du projet.
