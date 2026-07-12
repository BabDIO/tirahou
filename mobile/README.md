# TIRAHOU Mobile

Application mobile (Expo / React Native + TypeScript) réservée aux **étudiants** et **enseignants**. Réutilise directement l'API backend Django déjà en production (`https://tirahou.onrender.com/api/v1`, configurable via `.env`).

## Démarrer

```bash
cd mobile
npm install
npm start
```

Puis :
- **Sur un téléphone** : installer l'app **Expo Go** (App Store / Play Store) et scanner le QR code affiché dans le terminal.
- **Dans un émulateur** : `npm run android` ou `npm run ios` (nécessite Android Studio / Xcode installés).
- **Dans le navigateur** (aperçu rapide, fonctionnalités limitées) : `npm run web`.

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Étudiant | etudiant@tirahou.edu | Etudiant123! |
| Enseignant | enseignant@tirahou.edu | Enseignant123! |

## Périmètre actuel (v1)

**Étudiant** : dashboard, notes, emploi du temps, assiduité (lecture seule), profil.
**Enseignant** : dashboard, saisie des notes, mes cours, gestion des feuilles de présence (ouverture/fermeture + code de séance), profil.

## Limitations connues

- La double authentification (MFA) n'est pas prise en charge — utiliser le site web pour les comptes avec MFA activé.
- Les étudiants ne peuvent pas encore saisir le code de présence communiqué par l'enseignant (l'app affiche le code côté enseignant, mais aucun écran de saisie n'existe encore côté étudiant).
- Seuls les rôles `etudiant` et `enseignant` sont pris en charge ; les autres comptes sont redirigés vers la page de connexion avec un message dédié.

## Architecture

- **Navigation** : `expo-router` (fichiers dans `app/`), groupes `(student)` et `(teacher)` avec layouts à onglets gardés par rôle.
- **Auth** : JWT (access + refresh), stocké via `expo-secure-store` (Keychain/Keystore natif), avec repli `localStorage` sur le web (`lib/storage.ts`).
- **API** : `lib/api.ts`, client axios avec injection automatique du token et refresh silencieux sur 401 — mêmes conventions que `frontend/src/lib/axios.ts`.
- **État global** : `zustand` (`store/authStore.ts`).
