# Guide de soutenance — Logique d'implémentation des fonctionnalités TIRAHOU

> **Objectif de ce document** : pour chaque domaine fonctionnel de la plateforme, expliquer *ce qui a été implémenté*, *comment* (modèles, formules, algorithmes réels — pas des approximations), et *pourquoi* (le raisonnement de conception), afin de pouvoir répondre avec précision aux questions du jury. Contrairement aux anciens documents `INVENTAIRE_FONCTIONNALITES.md` / `RESUME_IMPLEMENTATION_FONCTIONNALITES.md` (obsolètes, rédigés avant plusieurs implémentations), chaque affirmation ci-dessous a été vérifiée directement dans le code source au moment de la rédaction.

---

## Table des matières

1. [Architecture générale — décisions de conception](#1-architecture-générale--décisions-de-conception)
2. [Authentification & RBAC (13 rôles)](#2-authentification--rbac-13-rôles)
3. [Structure académique & Programmes LMD](#3-structure-académique--programmes-lmd)
4. [Admissions](#4-admissions)
5. [Inscriptions (administrative, pédagogique, UE)](#5-inscriptions-administrative-pédagogique-ue)
6. [Finance](#6-finance)
7. [Documents & GED (vérification par QR code)](#7-documents--ged-vérification-par-qr-code)
8. [Évaluation & Délibérations — le cœur du système LMD](#8-évaluation--délibérations--le-cœur-du-système-lmd)
9. [LMS / Campus numérique](#9-lms--campus-numérique)
10. [Classes virtuelles hybrides](#10-classes-virtuelles-hybrides)
11. [Présences intelligentes](#11-présences-intelligentes)
12. [Emploi du temps](#12-emploi-du-temps)
13. [Stages & Mémoires](#13-stages--mémoires)
14. [Communication](#14-communication)
15. [Analytics prédictifs](#15-analytics-prédictifs)
16. [Bibliothèque numérique](#16-bibliothèque-numérique)
17. [Extensions : Wallet, Badges, Marketplace, Micro-certifications](#17-extensions--wallet-badges-marketplace-micro-certifications)
18. [Application mobile](#18-application-mobile)
19. [Assistant IA (Chatbot)](#19-assistant-ia-chatbot)
20. [Sécurité transverse](#20-sécurité-transverse)
21. [Questions probables du jury — et réponses](#21-questions-probables-du-jury--et-réponses)

---

## 1. Architecture générale — décisions de conception

**Ce qui a été fait** : architecture 3-couches découplée — frontend React 19 (SPA/PWA) qui ne parle au backend que par HTTP/JSON via une API REST versionnée (`/api/v1/`), authentifiée par JWT Bearer. Le backend Django est découpé en **19 applications** à responsabilité unique (une par domaine métier), chacune avec ses propres modèles, serializers, vues et permissions.

**Pourquoi ce découpage plutôt qu'un monolithe Django classique avec templates ?**
- Un frontend et un backend découplés permettent de faire évoluer l'un sans casser l'autre, et ouvrent la voie à plusieurs clients consommant la même API — ce qui s'est concrètement vérifié : la même API REST alimente aujourd'hui le site web **et** l'application mobile Expo, sans aucune duplication de logique métier côté serveur.
- Le découpage en applications Django à responsabilité unique limite le couplage : le module `finance` ne connaît pas les détails internes du module `evaluation`, ils communiquent via des clés étrangères et des services explicites. Cela a permis un développement itératif module par module (cf. méthodologie, section 1.6 du mémoire).

**Logique derrière le choix JWT plutôt que sessions Django classiques** : une session Django repose sur un cookie stocké côté serveur — peu adapté à une SPA qui peut tourner sur un domaine différent (Vercel) de l'API (Render), et pas du tout adapté à une application mobile native qui n'a pas de notion de cookie de navigateur. Le JWT est un jeton auto-porteur (contient `user_id`, `email`, `roles`) que n'importe quel client (web, mobile) peut stocker et envoyer dans l'en-tête `Authorization: Bearer <token>`.

---

## 2. Authentification & RBAC (13 rôles)

**Ce qui a été fait** : authentification par JWT (`djangorestframework-simplejwt`) avec **access token** de courte durée et **refresh token** de 7 jours, rotation et blacklist des tokens invalidés. Contrôle d'accès par **13 rôles** (`super_admin`, `admin_institutionnel`, `admin_scolarite`, `admin_financier`, `responsable_pedagogique`, `chef_departement`, `enseignant`, `tuteur`, `bibliothecaire`, `support_technique`, `etudiant`, `doctorant`, plus les acteurs externes `candidat`/`invite`), avec des permissions **granulaires par module et par action** (view/create/edit/delete/validate).

**La logique technique précise (`apps/accounts/permissions.py`, classe `HasModulePermission`)** :
- Un utilisateur `superuser` ou ayant le rôle `super_admin` **bypass** systématiquement tout contrôle — c'est le rôle d'administration technique de la plateforme.
- Une vue qui ne déclare pas explicitement l'attribut `permission_module` se comporte exactement comme avant l'introduction de ce mécanisme (simple `IsAuthenticated`) — **aucune régression** sur les vues non migrées.
- Pour les vues qui déclarent un `permission_module`, la méthode HTTP est traduite en action métier (`GET`→`view`, `POST`→`create`, `PUT/PATCH`→`edit`, `DELETE`→`delete`), et l'accès est vérifié via la chaîne `Role → RolePermission → Permission`.
- **Cas particulier volontaire** : les actions portant sur un objet précis (`retrieve`, `update`, `destroy`) ne sont **pas** bloquées au niveau `has_permission` — elles sont déléguées à `has_object_permission`, qui autorise en plus **explicitement un utilisateur à agir sur sa propre fiche** (`obj == user`) sans avoir besoin de la permission RBAC du module. C'est ce qui permet à n'importe quel rôle de modifier son propre profil (`PATCH /users/<son-id>/`) depuis la page "Profil" sans lui donner la permission `edit` sur tout le module `users`.
- Les actions personnalisées non standard (ex. `@action` DRF comme `validate`, `publish`, `accept`) sont traitées par défaut comme nécessitant la permission `validate`, sauf si la vue déclare explicitement un dictionnaire `permission_action_map` pour affiner ce mapping.

**Pourquoi cette conception (et pas un simple `if user.role == 'admin'` dans chaque vue) ?** Un contrôle d'accès dispersé dans chaque vue est difficile à auditer et sujet à l'oubli. En centralisant la logique dans une seule classe de permission DRF réutilisable, l'ajout d'un nouveau module ne demande qu'une ligne (`permission_module = 'finance'`) et bénéficie immédiatement de toute la logique déjà testée.

**Point important à mentionner au jury** : avant l'introduction de `HasModulePermission`, `User.has_permission()` existait déjà dans le modèle mais **n'était jamais appelé** par les vues — l'accès reposait uniquement sur l'authentification et sur les gardes de route côté frontend (facilement contournables via un appel API direct). Ce point a été identifié et corrigé : c'est un exemple concret de la démarche d'audit critique appliquée tout au long du projet plutôt que de se fier aux apparences du frontend.

---

## 3. Structure académique & Programmes LMD

**Ce qui a été fait** : modélisation hiérarchique `Université > Faculté > Département > Programme > Semestre > UE (Unité d'Enseignement) > EC (Élément Constitutif)`, avec un modèle `LMDRegulation` (règlement pédagogique) configurable par établissement/programme, définissant notamment :
- `passing_grade` (note de passage, généralement 10/20)
- `compensation_allowed` (la compensation entre UE est-elle autorisée ?)
- `compensation_min_grade` (moyenne UE plancher en-dessous de laquelle une UE n'est jamais compensable, même si le semestre est globalement admis)

**Pourquoi un modèle de règlement configurable plutôt que des règles codées en dur ?** Chaque établissement (et parfois chaque programme au sein d'un même établissement) peut avoir des règles de compensation légèrement différentes. En sortant ces paramètres dans un modèle de données plutôt que dans le code Python, un administrateur peut ajuster les règles sans déploiement — c'est directement ce qui permet de répondre à l'hypothèse de travail H2 du mémoire (« le système LMD peut être modélisé génériquement pour s'adapter à des établissements différents sans modification du code »).

---

## 4. Admissions

**Ce qui a été fait** : un workflow de candidature avec un modèle `Application` suivant un cycle de statuts en plusieurs étapes (brouillon → soumission → étude du dossier → décision), chacune avec ses propres transitions contrôlées (`STATUS_CHOICES` dans `apps/admissions/models.py`), plus la gestion des pièces justificatives et une action `admit`/décision d'admission déclenchée par l'administration scolarité.

**Logique métier** : le statut d'une candidature ne peut avancer que dans un sens (pas de retour arrière arbitraire), ce qui garantit la traçabilité du dossier. La décision d'admission (`POST /applications/{id}/admit/`) est une action métier dédiée plutôt qu'une simple modification de champ `status` — cela permet de déclencher des effets de bord contrôlés (création automatique du compte étudiant, notification) au même endroit, plutôt que de les disperser dans plusieurs vues.

---

## 5. Inscriptions (administrative, pédagogique, UE)

**Ce qui a été fait** : le processus d'inscription est volontairement scindé en **trois niveaux distincts** :
1. **Inscription administrative** (`AdminEnrollment`) : l'étudiant est inscrit à l'établissement pour une année académique donnée, avec un statut global (`validee`, etc.).
2. **Inscription pédagogique** (`PedaEnrollment`) : l'étudiant est inscrit à un semestre/niveau précis.
3. **Inscription aux UE** : l'étudiant est inscrit aux unités d'enseignement du semestre.

**Pourquoi cette séparation en trois niveaux plutôt qu'un seul modèle "Inscription" ?** Ces trois notions ont des cycles de vie et des responsables différents dans la réalité d'un établissement : l'inscription administrative est gérée par la scolarité et conditionnée par le paiement des frais, l'inscription pédagogique par les responsables de programme, et l'inscription aux UE peut varier en cours de semestre (options, rattrapages). Fusionner ces trois notions aurait forcé des compromis artificiels (par exemple, empêcher un étudiant en dette financière administrative de continuer à suivre pédagogiquement son semestre le temps de régulariser). Cette séparation est directement ce qui permet au module `evaluation` de calculer un résultat semestriel (`SemesterResult`) indépendamment du statut du paiement des frais, tout en laissant le module `finance` bloquer la délivrance de documents officiels tant que le dossier financier n'est pas soldé (cf. section 6).

---

## 6. Finance

**Ce qui a été fait** : un cycle facturation → paiement → suivi complet, avec trois modèles centraux :
- `Invoice` (facture), statut par défaut `emise`, cycle de vie propre (`STATUS_CHOICES`).
- `Payment`, statut par défaut `en_attente` — **un paiement n'est pas automatiquement validé à sa création**, il doit être confirmé (rapprochement bancaire, vérification Mobile Money manuelle, etc.) avant d'impacter le solde de la facture.
- `Scholarship` (bourse/exonération), également avec son propre cycle `en_attente → ...`.

**Logique métier clé** : le statut `en_attente` par défaut sur `Payment` n'est pas un oubli — c'est une décision volontaire pour refléter la réalité du terrain : un versement Mobile Money ou un dépôt en espèces à un guichet partenaire n'est pas instantanément vérifiable par la plateforme (pas d'intégration API avec les opérateurs Mobile Money ivoiriens à ce stade — voir les limites, section 20). Un agent financier doit confirmer manuellement le paiement pour qu'il soit pris en compte dans le "taux de collecte" du tableau de bord.

**Pourquoi ce choix plutôt que de valider automatiquement tout paiement déclaré ?** Valider automatiquement aurait ouvert une faille évidente (un étudiant pourrait déclarer un paiement fictif). Le compromis retenu accepte un coût opérationnel (validation manuelle) en échange d'une garantie d'intégrité des données financières — un arbitrage assumé et documenté plutôt qu'une négligence.

---

## 7. Documents & GED (vérification par QR code)

**Ce qui a été fait** : génération de documents officiels (certificats, relevés de notes, attestations, diplômes, carte étudiant, fiche d'inscription — 11 types de documents au total) en PDF, chacun porteur d'un **code de vérification unique** encodé également en QR code. La route publique `GET /verify/{code}/` (**sans authentification requise**) permet à n'importe quel tiers (employeur, autre établissement) de vérifier l'authenticité d'un document simplement en scannant son QR code ou en saisissant le code.

**Pourquoi une route publique sans authentification, alors que le reste de l'API exige un JWT ?** C'est un choix délibéré et cohérent avec l'objectif de la fonctionnalité : le *vérificateur* n'est par définition pas un utilisateur de la plateforme (un recruteur, un service RH externe) et ne doit pas avoir besoin de créer un compte pour vérifier un diplôme. La sécurité ne repose donc pas sur l'authentification mais sur le **secret du code** (suffisamment long/aléatoire pour ne pas être devinable) et sur le fait que la route ne renvoie que des informations minimales de vérification (authentique/non authentique, type de document, nom, date), jamais le contenu complet du document.

---

## 8. Évaluation & Délibérations — le cœur du système LMD

C'est le module le plus dense en règles métier et probablement celui qui suscitera le plus de questions techniques précises du jury. Voici les **formules exactes**, telles qu'implémentées dans `apps/evaluation/models.py`.

### 8.1 Note finale d'un EC (`Grade.calculate_final_grade()`)

```
note_finale = (note_CC × poids_CC) + (note_Examen × poids_Examen) + bonus − pénalités
```
Par défaut, `poids_CC = 0.4` et `poids_Examen = 0.6` (configurables par note). Si l'étudiant est marqué absent, `note_finale = 0` directement, sans appliquer la formule. Le résultat est toujours borné entre 0 et 20 (`max(0, min(20, final))`), y compris quand des points bonus feraient dépasser 20.

Ce calcul est déclenché **automatiquement** à chaque `save()` du modèle `Grade` dès qu'une note CC ou Examen est renseignée — l'enseignant n'a jamais besoin d'appeler un endpoint de calcul séparé, ce qui élimine une classe entière de bugs (note finale désynchronisée d'une note CC modifiée après coup).

### 8.2 Moyenne d'UE (`UEResult.calculate_ue_average()`)

```
moyenne_UE = Σ(note_EC_i × coefficient_EC_i) / Σ(coefficient_EC_i)
```
C'est une **moyenne pondérée par les crédits** de chaque EC, pas une moyenne arithmétique simple — un EC à 6 crédits pèse deux fois plus qu'un EC à 3 crédits dans la moyenne d'UE. Cas particulier : si **tous** les EC de l'UE sont marqués absents, l'UE entière est décidée `absent` sans attendre la compensation semestrielle.

À ce stade, la décision (`valide`/`ajourné`) est **provisoire** : une UE ≥ 10 est validée immédiatement, mais une UE < 10 n'est pas encore définitivement ajournée, car elle peut encore être compensée — ce qui ne se détermine qu'une fois la moyenne du semestre entier connue (voir 8.3).

### 8.3 Moyenne semestrielle et compensation (`SemesterResult.calculate_semester_average()`)

```
moyenne_semestre = Σ(moyenne_UE_i × crédits_UE_i) / Σ(crédits_UE_i)
```
Puis, UE par UE, la règle de compensation s'applique :
- Si `moyenne_UE ≥ passing_grade` (10 par défaut) → déjà validée depuis l'étape précédente.
- Sinon, **si le semestre est globalement admis** (`moyenne_semestre ≥ passing_grade`) **et** que la compensation est autorisée par le règlement (`LMDRegulation.compensation_allowed`) **et** que la moyenne de l'UE ne descend pas sous le plancher de compensation (`compensation_min_grade`, 8/20 par défaut) → l'UE passe en décision `compense`, ses crédits sont acquis et capitalisés.
- Sinon (semestre admis mais UE trop faible pour être compensée) → décision `dette`.
- Si le semestre n'est pas admis → l'UE reste `ajourné`.

**Pourquoi calculer la compensation en deux passes (UE d'abord, semestre ensuite, puis re-décision des UE) plutôt qu'en une seule passe ?** C'est une contrainte logique incontournable du système LMD : on ne peut pas savoir si une UE est *compensée* sans déjà connaître la moyenne du semestre, mais on ne peut pas calculer la moyenne du semestre sans déjà avoir les moyennes de chaque UE. La seule façon correcte de résoudre cette dépendance circulaire est de calculer d'abord toutes les moyennes d'UE (décision provisoire), puis la moyenne semestrielle, puis de revenir corriger les décisions d'UE à la lumière du résultat semestriel global.

### 8.4 GPA et mentions

Le GPA (échelle 4.0, utile pour les dossiers internationaux) est dérivé par palier de la moyenne sur 20 (16+→4.0, 14+→3.5, 12+→3.0, 10+→2.5, <10→0.0), et les mentions suivent le barème académique standard (Très bien ≥16, Bien ≥14, Assez bien ≥12, Passable ≥10, Insuffisant/Ajourné <10).

### 8.5 Cycle de vie d'une note et réclamations

Statuts d'une note : `saisie → validée → publiée`, avec un statut annexe `contestée`. Une **réclamation** (`GradeContest`) ne peut être soumise par l'étudiant que sur une note déjà `validée` ou `publiée` (pas sur une note encore en saisie brute), et **une seule réclamation active à la fois** par note (contrôle applicatif explicite dans `submit_grade_contest`). La validation en masse (`validate_grades_bulk`) est réservée au responsable pédagogique et déclenche un recalcul automatique des résultats d'UE et de semestre concernés.

**Point à défendre** : historiquement, il existait un fichier `grade_services.py` plus ancien avec une logique de calcul différente (basée sur un modèle `enrollment` plutôt que `student`/`exam_session` directement). Le fichier actif et utilisé par les endpoints réels (`/evaluation/teacher/enter-grade/`, `/evaluation/admin/calculate-semester/`, etc.) est `services.py` + les méthodes du modèle décrites ci-dessus — c'est la version qui intègre le règlement `LMDRegulation` configurable, plus aboutie que la première itération.

---

## 9. LMS / Campus numérique

**Ce qui a été fait** : chaque enseignant dispose d'un **espace de cours** (`CourseSpace`) par EC, avec modules pédagogiques, ressources téléchargeables, devoirs (`Assignment` + `Submission`), quiz (`Quiz` + `QuizAttempt`), et un suivi de progression par étudiant.

**Logique derrière le suivi de progression** : chaque interaction (vue de ressource, tentative de quiz, rendu de devoir) alimente le modèle `LearningActivity` dans `analytics_app` — ce même flux de données est réutilisé par le module Analytics prédictifs (section 15) pour calculer le score d'engagement. C'est un exemple concret de **réutilisation de données transverse** entre modules plutôt que de silos étanches : le LMS ne "sait" pas qu'il alimente un modèle prédictif de décrochage, il se contente d'enregistrer les événements ; c'est le module analytics qui les agrège a posteriori.

---

## 10. Classes virtuelles hybrides

**Ce qui a été fait** : support de **5 fournisseurs de visioconférence** (BigBlueButton, Jitsi, Zoom, Google Meet, Microsoft Teams) pour une même séance planifiée, avec suivi des participants.

**Pourquoi supporter 5 fournisseurs plutôt qu'un seul intégré nativement (ex. juste BBB) ?** Les établissements ciblés n'ont pas tous la même infrastructure ou les mêmes abonnements existants — certains ont déjà un compte Zoom institutionnel, d'autres préfèrent l'auto-hébergement BigBlueButton (open-source, gratuit) pour ne pas dépendre d'un tiers. Rendre le fournisseur configurable par séance plutôt que figé au niveau de la plateforme évite de forcer un établissement à changer d'outil de visioconférence pour adopter TIRAHOU.

---

## 11. Présences intelligentes

**Ce qui a été fait** (`apps/attendance/models.py` + `views.py`) : chaque séance planifiée peut avoir une **feuille de présence** (`AttendanceSheet`, relation `OneToOne` avec `ScheduledSession` — une seule feuille possible par séance). À la création, un `session_code` aléatoire à 6 caractères est généré automatiquement (lettres majuscules + chiffres). L'enseignant **ouvre** la feuille (`POST /attendance-sheets/{id}/open/`), ce qui génère également un QR code encodant ce même code, à projeter en plein écran. Les étudiants présents saisissent ce code (`POST /attendance-sheets/{id}/mark_by_code/`) — le serveur vérifie que la feuille est bien ouverte et que le code correspond exactement avant de créer un `AttendanceRecord` avec le statut `present`.

**Logique de fermeture** : à la fermeture de la feuille (`POST .../close/`), le système marque automatiquement **absents** tous les étudiants inscrits à l'EC de cette séance qui n'ont pas encore de `AttendanceRecord` — l'enseignant n'a donc jamais besoin de pointer manuellement les absents un par un, seule la présence active demande une action.

**Pourquoi un code alphanumérique + QR plutôt qu'un simple pointage manuel par l'enseignant ?** Le pointage manuel enseignant-par-enseignant ne passe pas à l'échelle pour de grands amphithéâtres et est propice aux erreurs/omissions. Le code de séance déplace la charge de saisie vers chaque étudiant individuellement (un seul code à taper), tout en gardant un filet de sécurité : la fermeture automatique bascule tout le monde en absent par défaut, donc un étudiant qui ne pointe pas reste correctement compté comme absent sans action supplémentaire.

---

## 12. Emploi du temps

**Ce qui a été fait** : modèles `Room` (salles), `ScheduledSession` (séances planifiées liant EC, enseignant, salle, créneau horaire, mode présentiel/hybride/distanciel), consultables par étudiant (planning personnel dérivé de ses inscriptions aux UE) et par enseignant (ses propres séances).

---

## 13. Stages & Mémoires

**Ce qui a été fait** : suivi des stages (`Internship`), mémoires et thèses (`Thesis`), et soutenances (`Defense`), avec un encadrant assigné (tuteur/enseignant).

---

## 14. Communication

**Ce qui a été fait** : notifications internes multi-canal (in-app + email, potentiellement SMS selon configuration), annonces institutionnelles, messagerie. Chaque événement métier significatif (publication de résultat, validation d'admission, rappel de paiement) déclenche une notification via un `NotificationService` centralisé — c'est ce même service qui est appelé depuis le module évaluation (publication de résultats), finance (rappels de paiement, tâches Celery planifiées quotidiennement), et autres.

---

## 15. Analytics prédictifs

C'est un module central à bien maîtriser pour la soutenance : c'est l'un des arguments scientifiques forts du mémoire.

### 15.1 Score de prédiction de réussite/décrochage (formule réelle du code)

```
score_prediction = (moyenne_notes × 0.4) + (taux_assiduité × 0.3) + (engagement × 0.2) + (taux_complétion × 0.1)
```

Puis classification en 4 niveaux de risque selon ce score :
- **≥ 75** → risque **faible**
- **≥ 60** → risque **moyen**
- **≥ 45** → risque **élevé**
- **< 45** → risque **critique**

**Pourquoi ces poids précis (40/30/20/10) et pas une autre répartition ?** Ce sont des poids **heuristiques**, assumés comme tels dans le mémoire (section « Limites du système », L2) : ils reflètent un jugement métier raisonnable (la performance académique et l'assiduité pèsent plus lourd que l'engagement déclaratif ou la complétion de contenu optionnel), mais n'ont **pas été calibrés statistiquement** sur des données réelles de décrochage, faute d'un jeu de données historique labellisé (étudiants ayant réellement décroché vs. ceux ayant réussi). C'est explicitement identifié comme une perspective d'évolution (remplacement par un modèle de machine learning supervisé, section 5.7.2 du mémoire) — **à assumer clairement devant le jury plutôt que présenter ces poids comme scientifiquement validés**.

### 15.2 Détection des étudiants à risque

Le tableau des étudiants à risque combine plusieurs signaux indépendants du score de prédiction global : `connection_count < 5` (faible régularité de connexion), `completion_rate < 30` (faible complétion LMS), `assignments_submitted == 0` (aucun devoir rendu) — chacun généra une alerte spécifique dans la liste de recommandations, ce qui permet à l'enseignant de savoir **pourquoi** un étudiant est signalé, pas seulement qu'il l'est.

**Pourquoi combiner un score global ET des règles de seuil individuelles plutôt que le score seul ?** Un score composite unique peut masquer un signal fort et spécifique (par exemple un étudiant avec une bonne moyenne mais qui n'a rendu aucun devoir depuis un mois) derrière une moyenne pondérée rassurante. Les règles de seuil individuelles servent de filet de sécurité pour ne pas noyer un signal d'alerte clair dans un agrégat.

---

## 16. Bibliothèque numérique

**Ce qui a été fait** : catalogue (numérique et physique), emprunts, réservations. Interface dédiée côté étudiant (`/library`) avec onglet "Mes emprunts".

---

## 17. Extensions : Wallet, Badges, Marketplace, Micro-certifications

Ces modules ont été ajoutés après la rédaction initiale du cahier des charges (section 15 du mémoire les qualifie d'« extensions stratégiques »).

- **Wallet (portefeuille de points)** : chaque étudiant a un solde de points, alimenté par des transactions (`WalletTransaction`) créditrices (récompenses, badges) ou débitrices (achats sur la marketplace).
- **Badges** : attribution manuelle (par un enseignant/admin) ou **automatique** lors de l'obtention d'une micro-certification liée.
- **Micro-certifications** : un étudiant s'inscrit à une certification courte, un enseignant/admin le certifie une fois les critères remplis, ce qui déclenche l'attribution automatique du badge associé et le crédit de points correspondant.
- **Marketplace de cours** : une application backend dédiée (`apps.marketplace`) où des cours optionnels peuvent être "achetés" avec les points du wallet plutôt qu'en argent réel.

**Logique derrière la gamification** : le choix de faire circuler une monnaie interne (points, pas d'argent réel) permet de motiver l'engagement (LMS, assiduité) sans complexité réglementaire liée à de la vraie monnaie, tout en réutilisant l'infrastructure marketplace pour donner un débouché concret à ces points plutôt qu'un simple compteur cosmétique.

---

## 18. Application mobile

**Ce qui a été fait** : application native (Expo / React Native + TypeScript), volontairement scopée aux rôles **étudiant** et **enseignant** uniquement, réutilisant directement l'API REST de production (aucun backend séparé, aucune duplication de logique métier).

**Pourquoi ce périmètre restreint ?** Développer une application couvrant les 13 rôles aurait démultiplié le travail d'interface pour un bénéfice marginal — les rôles administratifs (finance, scolarité, direction) opèrent presque exclusivement depuis un poste de travail avec de grands tableaux/formulaires peu adaptés à un écran de téléphone, alors que les étudiants et enseignants ont un besoin réel de consultation/action rapide en mobilité (consulter une note, prendre une présence). Ce choix de périmètre est un exemple de priorisation produit assumée plutôt qu'une limitation technique.

**Détails techniques** : navigation par fichiers (`expo-router`), authentification JWT avec refresh automatique identique au client web (mêmes conventions dans `lib/api.ts`), stockage sécurisé des tokens via le Keychain (iOS) / Keystore (Android) natifs (`expo-secure-store`), avec repli `localStorage` uniquement pour l'aperçu navigateur de développement (`expo start --web`), qui ne dispose pas d'implémentation native de SecureStore.

---

## 19. Assistant IA (Chatbot)

**Ce qui a été fait** : un assistant conversationnel (widget flottant, présent sur toutes les pages authentifiées) qui répond en français aux questions sur TIRAHOU, propulsé par l'API Claude d'Anthropic (`claude-opus-4-8`). Nouvelle app Django `apps/chatbot` : deux modèles (`ChatConversation`, `ChatMessage`), un service d'intégration (`claude_service.py`), une couche d'outils de « function calling » ancrés sur les données réelles (`tools.py`).

**Le point à défendre devant le jury : l'ancrage sur des données réelles (« grounding »), pas un chatbot qui invente.** Un LLM généraliste répondrait à « quelles sont mes notes ? » en fabriquant une réponse plausible mais fausse. Ici, le modèle ne connaît a priori aucune donnée personnelle : quand la question l'exige, il déclenche un appel de fonction (`tool_use`) vers un outil côté serveur qui interroge directement la couche métier existante — `ResultService.get_student_transcript()` pour les notes (le même service que la génération de relevé PDF), les modèles `ScheduledSession`/`PedaEnrollment` pour l'emploi du temps, `AttendanceRecord` pour l'assiduité, `CourseSpace` pour les cours d'un enseignant. Le résultat est réinjecté dans la conversation et le modèle formule sa réponse à partir de ces données réelles, jamais de données inventées.

**Boucle agentique** : implémentée manuellement (`while` sur `stop_reason == "tool_use"`, jusqu'à 4 itérations) plutôt qu'avec le *tool runner* bêta du SDK — plus simple à intégrer dans un cycle requête/réponse Django synchrone, et sans dépendance à une fonctionnalité encore bêta.

**Périmètre de sécurité — pourquoi le chatbot n'élargit pas la surface RBAC** :
- Chaque outil dérive son périmètre **uniquement** de `request.user` (`get_my_grades(user)`, jamais un `student_id` fourni par le modèle) : un utilisateur ne peut donc structurellement jamais faire fuiter, via un prompt habile, les données d'un tiers — l'assistant ne « voit » que ce que l'utilisateur verrait déjà en naviguant l'application.
- Seuls les rôles **étudiant** et **enseignant** reçoivent des outils ancrés sur des données personnelles (notes, emploi du temps, assiduité, cours). Les autres rôles (scolarité, finance, responsable pédagogique, bibliothécaire, admin) ont un assistant généraliste — utile pour naviguer la plateforme — mais sans outil d'accès à des données, précisément pour ne pas dupliquer via le chatbot le [gap RBAC row-level connu](#21-questions-probables-du-jury--et-réponses) sur les vues bulk.
- Le système prompt interdit explicitement de répondre à des questions engageantes (médical, juridique, financier).

**Dégradation propre sans clé API** : comme les autres intégrations externes du projet (CinetPay, BigBlueButton, Twilio — voir `settings.py`, section « Intégrations nécessitant des identifiants externes »), `ANTHROPIC_API_KEY` est un simple paramètre d'environnement absent par défaut. Sans clé configurée, l'endpoint renvoie un `503` avec un message clair côté frontend plutôt qu'un crash — testé en conditions réelles (serveur de dev sans clé) pendant le développement.

**Effet de bord utile** : la construction de l'outil `get_my_grades` a mis en évidence un bug préexistant et silencieux dans `ResultService.get_student_transcript()` (`apps/evaluation/services.py`) — le code référençait `semester.name`, un attribut qui n'existe pas sur le modèle `Semester` (le bon champ est `label`), et l'exception était avalée par un `except Exception` qui renvoyait `None`. Ce service est aussi utilisé par la génération du relevé de notes PDF (`apps/documents/pdf_views.py`) : ce bug cassait donc silencieusement une fonctionnalité déjà existante, pas seulement le chatbot. Corrigé et vérifié (le relevé d'un étudiant test s'affiche désormais correctement, moyenne/mention/rang inclus).

**Modèle et coût** : `claude-opus-4-8` avec `thinking: {"type": "adaptive"}`, `max_tokens=1500` pour borner la latence et le coût par échange. L'historique de conversation est persisté (`ChatConversation`/`ChatMessage`) pour permettre le suivi multi-tours et la traçabilité (`tools_used` enregistre quels outils ont été appelés pour chaque réponse, utile en cas de question du jury sur la transparence du système).

---

## 20. Sécurité transverse

Récapitulatif des mécanismes de sécurité qui traversent tous les modules (déjà détaillés module par module ci-dessus, listés ici pour une vue d'ensemble) :

| Mécanisme | Implémentation |
|---|---|
| Authentification | JWT (access court + refresh 7j avec rotation et blacklist) |
| Autorisation | RBAC granulaire module × action (`HasModulePermission`) |
| Traçabilité | Audit log sur les opérations sensibles |
| Anti-abus | Rate limiting (throttling DRF) par classe d'utilisateur |
| Transport | HTTPS forcé, HSTS, CORS strict (origines explicitement whitelistées) |
| Intégrité documentaire | QR code + code de vérification unique, route de vérification publique |
| Configuration prod | `DEBUG=False`, settings de production séparés (`settings_production.py`) |

---

## 21. Questions probables du jury — et réponses

**Q : Pourquoi Django plutôt que Node.js/Express ou Laravel ?**
R : L'ORM Django, l'admin auto-généré et l'écosystème DRF (serializers, permissions, throttling, pagination) réduisent fortement le code boilerplate pour un ERP data-intensif comme celui-ci. Le typage/la structure de Django REST Framework a aussi permis un développement module-par-module rigoureux (modèles → serializers → vues → tests avant de passer au module suivant).

**Q : Comment garantissez-vous que la compensation LMD est calculée correctement, et pas juste "moyenne ≥ 10 partout" ?**
R : voir section 8.3 — la compensation est calculée en deux passes à cause de la dépendance circulaire entre moyenne d'UE et moyenne de semestre, avec un plancher de compensation configurable (`LMDRegulation.compensation_min_grade`) pour éviter qu'une UE catastrophique soit "rattrapée" artificiellement par de bonnes UE ailleurs.

**Q : Le score de décrochage est-il fiable scientifiquement ?**
R : Non, et c'est assumé explicitement (section 15.1 et 5.6/L2 du mémoire) — c'est un modèle heuristique à poids fixes, pas calibré statistiquement faute de données réelles labellisées. La perspective d'évolution identifiée est un modèle ML supervisé une fois suffisamment de données collectées.

**Q : Que se passe-t-il si un paiement Mobile Money est déclaré frauduleusement ?**
R : Impossible en l'état actuel car aucun paiement n'est automatiquement validé (statut `en_attente` par défaut) — un agent financier doit confirmer manuellement chaque paiement avant qu'il n'impacte le solde de la facture ou le tableau de bord de collecte.

**Q : Un enseignant peut-il voir/modifier les notes d'un EC qui n'est pas le sien ?**
R : C'est une limite connue et documentée (L4, absence de Row-Level Security native) — le filtrage actuel se fait au niveau des vues (`get_teacher_grades` filtre par `entered_by=teacher.user`), ce qui protège l'usage normal via l'interface, mais un appel direct à l'API pourrait théoriquement contourner ce filtre applicatif si l'endpoint n'est pas soigneusement gardé. C'est explicitement identifié comme axe d'amélioration.

**Q : Pourquoi une application mobile séparée plutôt qu'une simple PWA (déjà en place) ?**
R : La PWA couvre déjà l'installation sur mobile et un fonctionnement partiellement hors-ligne, mais reste une page web encapsulée. L'application native offre une expérience de navigation par onglets réellement native, un accès sécurisé au stockage (Keychain/Keystore) et prépare le terrain pour des fonctionnalités futures impossibles en PWA pure (notifications push natives fiables, accès natif à la caméra pour le scan de QR code de présence, etc.).

---

*Document rédigé à partir d'une lecture directe du code source (`backend/apps/*/models.py`, `services.py`, `permissions.py`) le 14 juillet 2026, en complément du mémoire de fin d'études et destiné à préparer la soutenance orale.*
