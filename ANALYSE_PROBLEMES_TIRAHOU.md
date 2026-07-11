# 🔍 ANALYSE DES PROBLÈMES - PROJET TIRAHOU
**Date** : 11 Juillet 2026
**Version** : 1.2.0
**Statut** : Corrigé — le document original (commit `cdcefad`) contenait plusieurs affirmations fausses ou obsolètes, vérifiées et corrigées ci-dessous point par point.

---

## ⚠️ Note sur cette révision

Le document original a été généré sans vérification réelle contre l'état du dépôt : plusieurs "problèmes" qu'il décrivait comme non résolus étaient soit déjà corrigés au moment où il a été écrit, soit n'ont jamais été de vrais bugs. Chaque point ci-dessous a été revérifié directement dans le code avant correction.

---

## 📊 SYNTHÈSE EXÉCUTIVE (révisée)

- **Problèmes réellement corrigés depuis** : endpoints étudiant manquants (assiduité + statistiques de notes), dashboards sur données réelles, module parents/tuteurs, marketplace de cours, wallet, micro-certifications, badges.
- **Problèmes qui n'en étaient pas** : le "filtre teachers incorrect", le "onClick manquant sur StatsCard", le "thème sombre cassé" sur les dashboards cités.
- **Problèmes restants légitimes, non vérifiés dans cette session** : workflow transferts/mobilité, notifications temps réel WebSocket, intégrations externes (SMS/Mobile Money/anti-plagiat/SSO), application mobile native.

---

## ✅ CORRIGÉS DEPUIS LA RÉDACTION DU RAPPORT ORIGINAL

### 1. Endpoints API manquants — assiduité et statistiques étudiant
**Statut** : ✅ CORRIGÉ (commit `72594fd`)

Les endpoints suivants étaient effectivement absents et retournaient 404 :
```
GET /api/v1/student/attendance/
GET /api/v1/student/attendance/stats/
GET /api/v1/evaluation/student/statistics/
```

C'était un vrai bug (contrairement à d'autres points de ce document) — `MyAttendancePage.tsx` et `MyGradesPage.tsx` les appelaient depuis toujours sans qu'ils existent côté backend. Corrigé par l'ajout de :
- `student_attendance` / `student_attendance_stats` dans `apps/attendance/views.py` (la seconde réutilise le service existant `AttendanceService.get_student_attendance_stats`, déjà utilisé ailleurs par `AbsenceSummaryViewSet.my_stats`)
- `student_statistics` dans `apps/evaluation/views.py` (crédits obtenus/disponibles cumulés et moyenne générale, calculés depuis les `SemesterResult` et `Grade` réels)

Aucune modification frontend n'a été nécessaire : les deux pages attendaient déjà exactement la forme de réponse retournée par ces nouveaux endpoints.

---

### 2. ~~Filtre Teachers Incorrect~~ — n'était pas un bug
**Statut** : ❌ FAUX DIAGNOSTIC — code inchangé, il était déjà correct

Le rapport original affirmait que `backend/apps/lms/views.py` contenait :
```python
qs = qs.filter(teachers=user)  # décrit comme "INCORRECT"
```
et proposait de le remplacer par `teachers__user=user`.

**C'était une fausse alerte.** Le champ `CourseSpace.teachers` est un `ManyToManyField(User, ...)` — il pointe directement vers le modèle `User`, pas vers `Teacher`. Filtrer par `user` (l'utilisateur connecté, une instance `User`) est donc correct. Appliquer le "correctif" proposé (`teachers__user=user`) aurait en réalité **cassé** ce filtre, puisque `User` n'a pas d'attribut `.user`. Vérifié également sur les mêmes patterns dans `CourseModuleViewSet` et `AssignmentViewSet` (lignes ~124, 165, 209), tous cohérents avec le même modèle.

Aucune correction nécessaire.

---

### 3. Incohérence URLs API Frontend-Backend
**Statut** : Partiellement corrigé — les endpoints d'assiduité/statistiques cités en exemple sont réglés (voir point 1). Le reste de ce point (audit exhaustif de tous les appels API) reste un chantier ouvert et légitime si un audit complet est souhaité.

---

### 4. ~~Thème Sombre — Texte Illisible~~ — déjà correct sur les fichiers cités
**Statut** : ❌ FAUX DIAGNOSTIC pour les fichiers listés

Vérifié directement : `ScolariteDashboard.tsx` a déjà `dark:text-gray-50` sur chaque occurrence de `text-gray-900` (ex. lignes 142, 155, 156, 177, 210). Le rapport le listait comme "⚠️ restant à corriger" — c'était faux au moment de la rédaction.

Si des problèmes de contraste subsistent ailleurs dans le code, ils n'ont pas été confirmés par cette vérification et devraient être signalés avec un fichier/ligne précis plutôt que par balayage général.

---

### 5. ~~Données Simulées dans Dashboards~~ — corrigé avant la rédaction du rapport
**Statut** : ✅ Déjà corrigé quand le rapport a été écrit (donc obsolète dès sa publication)

Les dashboards listés (SuperAdmin, Financier, Scolarité, Bibliothécaire, Responsable) ainsi que le dashboard Étudiant ont tous été audités et reconnectés à de vraies agrégations backend (endpoints `/system-stats/`, `/finance/dashboard/`, `/responsable/dashboard/`, `/library/dashboard/`, `/enrollment/dashboard/`, `/student/dashboard/`) — plus aucun `MOCK_DATA`/`INITIAL_DATA` factice utilisé comme source d'affichage permanente. Les seules constantes restantes portant un nom similaire sont des états vides légitimes (zéros/tableaux vides), affichés uniquement le temps du tout premier chargement.

---

### 6. Types TypeScript manquants
**Statut** : Les fichiers cités (`FinancierDashboardEnriched.tsx`, `SuperAdminDashboard.tsx`) sont déjà corrects. Le typecheck complet (`tsc -b --force`) ne montre aucune erreur sur ces fichiers ; les erreurs TypeScript restantes dans le dépôt sont pré-existantes et sans rapport avec les dashboards (ex. `Breadcrumb.tsx`, `AnimatedPage.tsx`, `statusHelpers.ts`).

---

### 7. ~~Props manquantes — StatsCard sans onClick~~ — déjà présent
**Statut** : ❌ FAUX DIAGNOSTIC

`StatsCard` dans `components/ui/index.tsx` a déjà une prop `onClick?: () => void` (ligne 294), gérée avec `role="button"` et `tabIndex` pour l'accessibilité. Rien à corriger.

---

### 8. ~~Module Parents/Tuteurs Manquant~~ — implémenté
**Statut** : ✅ IMPLÉMENTÉ (le rapport le donnait à tort à 0%)

- Backend : modèle `ParentGuardian` (relation, contact, notifications, contact prioritaire/urgence/autorité légale), `ParentGuardianViewSet` avec actions `set_primary` et `bulk_notify` (celle-ci envoie réellement des emails/SMS, corrigée dans une passe précédente qui la trouvait factice).
- Frontend : `ParentsManagementPage.tsx`, routée sur `/scolarite/parents`, avec formulaire complet d'ajout/édition (sélection d'étudiant par recherche, lien de parenté, contacts, préférences de notification).

---

### 15. ~~Extensions Stratégiques (Marketplace / Micro-certifications / Wallet)~~ — implémentées
**Statut** : ✅ IMPLÉMENTÉES (le rapport les donnait à tort à 6%, "Phase 4")

- **Wallet** : portefeuille de points par étudiant, historique de transactions, page `/my-wallet`.
- **Badges** : catalogue, attribution manuelle ou automatique (via certification), page `/my-wallet` (étudiant) et onglet dédié dans `/admin/gamification`.
- **Micro-certifications** : catalogue, inscription étudiant, certification par un enseignant/admin avec attribution automatique du badge lié — page `/my-certifications` et onglet dans `/admin/gamification`.
- **Marketplace de cours** : nouvelle app backend `apps/marketplace` complète (cours, leçons, achats réglés en points du wallet, complétion, avis) — pages `/marketplace`, `/marketplace/:id`, `/marketplace/my-courses`.

Seule la **blockchain pour les certificats**, mentionnée dans la liste originale, reste non implémentée (et n'a pas de justification produit claire à ce stade).

---

## 🟡 PROBLÈMES NON VÉRIFIÉS DANS CETTE SESSION (ni confirmés, ni infirmés)

Ces points du rapport original n'ont pas été revérifiés contre le code actuel — ils sont laissés tels quels, à valider avant d'agir dessus :

### 9. Workflow Transferts/Mobilité
Le type `transfert` et le champ `previous_program` existent dans `AdminEnrollment`. La complétude du workflow (validation, équivalences de crédits, interface de suivi) n'a pas été revérifiée.

### 11. Notifications Temps Réel WebSocket
Les notifications push web (VAPID) ont été implémentées dans une session précédente, avec service worker (`sw.ts`, stratégie `injectManifest`). Cela couvre les notifications navigateur en arrière-plan, mais pas nécessairement un canal WebSocket temps réel pour l'UI ouverte (le polling à 30s existe pour la cloche de notifications). Statut réel non revérifié.

### 12. Intégrations Externes (SMS, Mobile Money, anti-plagiat, SSO/LDAP)
Confirmé dans une session précédente : ces intégrations existent sous forme d'adaptateurs réels (pas de simulation), gérés par `is_configured()` et gated par variables d'environnement — mais nécessitent des identifiants externes non disponibles dans cet environnement pour être activés. Le statut "structure prête, API non configurée" du rapport original est cohérent avec ça.

### 13. ~~PWA Incomplète~~ — vraisemblablement déjà plus avancée que décrit
**Statut** : le rapport original affirme "pas de service workers, pas de manifest complet, pas de support offline" — ceci contredit le travail effectué dans une session précédente (vite-plugin-pwa, stratégie `injectManifest`, service worker personnalisé `src/sw.ts` avec workbox precaching/routing/strategies, manifest avec icônes et shortcuts). Non revérifié en détail dans cette session, mais l'affirmation "0% / pas de service worker" est probablement fausse.

### 14. Application Mobile Native
Non implémentée — c'est correct, aucune app React Native/Flutter n'existe dans ce dépôt.

---

## 📋 CE QUI RESTE RÉELLEMENT À FAIRE (si applicable)

1. Auditer le workflow transferts/mobilité en détail (#9)
2. Clarifier le besoin réel de notifications WebSocket temps réel vs. push existant (#11)
3. Obtenir les identifiants externes (SMS, Mobile Money, anti-plagiat, SSO) pour activer les adaptateurs déjà codés (#12)
4. Revérifier l'état réel de la PWA avant de la considérer comme un chantier (#13)
5. Décider si une application mobile native est réellement dans le périmètre (#14)

---

**Document corrigé le** : 11 Juillet 2026
**Méthode** : chaque affirmation du rapport original a été vérifiée directement contre le code source (grep, lecture de fichiers, `tsc -b --force`) avant d'être confirmée, corrigée ou marquée comme non vérifiée.
