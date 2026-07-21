# Manuel d'utilisation — Démarrer TIRAHOU sur une base de données vide

> Ce manuel décrit, dans l'ordre réel des dépendances du modèle de données,
> comment faire vivre une installation TIRAHOU fraîchement déployée jusqu'à
> son premier semestre opérationnel. Chaque étape indique où la faire dans
> l'interface web, et le repli par **Django admin** (`/admin/`) quand
> aucune page frontend n'existe encore pour cette entité (précisé
> explicitement — voir §0.3).

---

## 0. Avant de commencer

### 0.1 Ce qui existe déjà après un déploiement standard

Le script `backend/build.sh`, exécuté à chaque déploiement Render, lance
automatiquement `create_test_users.py` : la base n'est donc **jamais
totalement vide en utilisateurs** — 7 comptes de démonstration sont déjà
créés (voir §0.4). En revanche, **aucune donnée académique ou métier**
n'existe (pas d'université, de filière, d'année, d'étudiant réel...) : c'est
ce vide-là que ce manuel comble.

### 0.2 Pour un vrai déploiement (pas une démo)

Avant de mettre le système entre les mains d'un établissement réel :

1. Retirez l'étape `python create_test_users.py` de `backend/build.sh`, **ou**
2. Changez immédiatement les mots de passe des comptes créés (ils sont
   publics dans ce dépôt), en particulier `admin@tirahou.edu`.

Créez ensuite un compte administrateur propre :
```bash
python manage.py createsuperuser
```
Ce compte a `is_superuser=True`, ce qui suffit à `HasModulePermission` pour
tout autoriser (voir `apps/accounts/permissions.py`) — pas besoin de lui
attribuer un rôle particulier pour administrer le système.

### 0.3 Ce que l'interface web ne couvre pas encore

À ce jour, la création de ces entités **n'a pas de formulaire dans
l'interface React** (uniquement lecture/liste côté frontend) — passez par
**Django admin** (`https://<votre-domaine>/admin/`) pour les créer :

| Entité | Frontend | Django admin |
|---|---|---|
| Université, Faculté, Département | Lecture seule (`/academic`) | ✅ à créer ici |
| Année académique | Lecture + "définir comme courante" (`/academic`) | ✅ à créer ici |
| Règlement LMD | Lecture seule (`/academic`) | ✅ à créer ici |
| Types de frais (`FeeType`) | Aucune page | ✅ à créer ici |

Tout le reste (programmes, maquettes, comptes, admissions, inscriptions,
groupes, salles, affectations, emploi du temps, notes, finance...) se fait
normalement depuis l'interface web — détaillé étape par étape ci-dessous.

### 0.4 Comptes de démonstration créés automatiquement

| Rôle | Email | Mot de passe |
|---|---|---|
| Super administrateur | `admin@tirahou.edu` | `Admin123!` |
| Étudiant | `etudiant@tirahou.edu` | `Etudiant123!` |
| Enseignant | `enseignant@tirahou.edu` | `Enseignant123!` |
| Scolarité | `scolarite@tirahou.edu` | `Scolarite123!` |
| Financier | `financier@tirahou.edu` | `Financier123!` |
| Responsable pédagogique | `responsable@tirahou.edu` | `Responsable123!` |
| Bibliothécaire | `bibliothecaire@tirahou.edu` | `Biblio123!` |

---

## 1. Structure institutionnelle — *Django admin*

Connectez-vous sur `/admin/` avec le compte super administrateur.

1. **Université** (`academic > University`) — nom, sigle, adresse, email,
   téléphone, site web. Une seule université en général (architecture
   mono-établissement, voir `docs/NOTE_CONCEPTION_MULTI_TENANT.md`).
2. **Faculté** (`academic > Faculty`) — rattachée à l'université, avec un
   doyen (`dean`) optionnel — nécessite un compte utilisateur existant si
   renseigné, vous pouvez le laisser vide et le rattacher plus tard.
3. **Département** (`academic > Department`) — rattaché à une faculté.

## 2. Année académique & règlement LMD — *Django admin*

1. **Année académique** (`academic > AcademicYear`) : label (ex.
   `2026-2027`), dates de début/fin, **dates de candidature** et
   **dates d'inscription** (administrative + pédagogique) — ces dates
   sont indicatives (le backend ne bloque pas une soumission hors
   fenêtre, voir §5), cochez `is_current = True` pour en faire l'année
   active affichée partout dans l'application.
2. **Règlement LMD** (`academic > LMDRegulation`) : cycle (licence/master),
   université, crédits par semestre, note de passage, compensation
   autorisée + note minimale de compensation, nombre d'années maximum.
   Créez au moins un règlement Licence et un règlement Master si vous
   proposez les deux cycles — un programme (filière) y sera rattaché à
   l'étape suivante.

## 3. Comptes du personnel — *interface web*

`Administration → Utilisateurs` (`/admin/users`), réservé aux rôles avec
permission sur le module `accounts`.

Créez au minimum : un compte **Scolarité** (`admin_scolarite`), un
**Financier** (`admin_financier`), un **Responsable pédagogique**
(`responsable_pedagogique`), et vos **Enseignants** (`enseignant`). Chaque
compte peut cumuler plusieurs rôles.

## 4. Filières et maquettes pédagogiques — *interface web*

`Structure Académique → Programmes` (`/programs`).

1. **Créer un programme** : code, nom, type (licence/master), mode
   (présentiel/hybride/distanciel), département, **règlement LMD** (créé à
   l'étape 2), nombre de semestres, capacité, frais, description. Cochez
   `candidature_open` quand vous êtes prêt à ouvrir les candidatures
   (étape 6).
2. **Construire la maquette** : dans la fiche du programme, ajoutez ses
   **semestres** (S1, S2...), puis pour chaque semestre ses **UE**
   (intitulé, crédits, coefficient), puis pour chaque UE ses **EC**
   (Éléments Constitutifs — intitulé, volume horaire, coefficient).
   C'est cette hiérarchie Niveau → Semestre → UE → EC qui porte ensuite
   les notes, les cours et l'emploi du temps.

## 5. Salles — *interface web*

`Emploi du temps → Nouvelle salle` (`/scheduling`) : code, nom, type
(amphithéâtre, salle TD, labo, salle virtuelle...), capacité, bâtiment,
étage, équipements. À faire avant de planifier des séances (étape 10).

## 6. Types de frais — *Django admin*

`finance > FeeType` (`/admin/`) : nom, catégorie (candidature, inscription,
réinscription, attestation, relevé de notes, soutenance, certificat...),
montant par défaut. Nécessaire avant de facturer quoi que ce soit en étape
13.

## 7. Admissions — *interface web + API*

`Admissions` (`/admissions`) est réservée au **traitement** des dossiers
par le personnel (instruire, décider, publier) — la **création** d'une
candidature n'a pas encore de page dédiée côté candidat (gap identifié,
voir remarque en fin de document). En attendant :

1. Créez un compte utilisateur pour chaque candidat (`/admin/users`, sans
   rôle particulier requis — n'importe quel utilisateur authentifié peut
   déposer une candidature pour lui-même).
2. Le candidat (ou vous, en son nom, via l'API ou Django admin —
   `admissions > Application`) crée sa candidature : programme, année
   académique, dernier diplôme, moyenne, lettre de motivation — puis la
   soumet (`POST /applications/{id}/submit/`, statut passe à *Soumise*).
3. Scolarité/responsable : `/admissions` → **Instruire** → **Décider**
   (admis / refusé / liste d'attente) → **Publier les décisions**.
4. Le candidat consulte son résultat sans compte via
   `/verify-admission` (numéro de dossier).

## 8. Inscriptions — *interface web*

`Inscriptions` (`/enrollment`), une fois la candidature *Admise* :

1. **Inscription administrative** — convertit la candidature, génère un
   numéro d'inscription, transforme l'utilisateur candidat en véritable
   fiche `Student` (matricule, statut).
2. **Groupes** — `Pédagogie → Groupes TD/TP` (`/responsable/groups`) :
   créez les groupes (promotion, TD, TP) du programme pour l'année en
   cours si ce n'est pas déjà fait.
3. **Inscription pédagogique** — rattache l'étudiant à un semestre et un
   groupe, puis à ses UE (inscriptions aux UE, avec dérogations de
   prérequis si besoin).

## 9. Affectations pédagogiques — *interface web*

`Pédagogie → Pilotage programmes` (`/responsable/programs`) : affectez
chaque enseignant aux EC qu'il encadre pour l'année académique en cours —
condition pour qu'il puisse saisir des notes et être visible dans son
espace "Mes Cours".

## 10. Emploi du temps — *interface web*

`Emploi du temps` (`/scheduling`) : créez les séances (EC, groupe,
enseignant, salle, créneau, mode présentiel/distanciel/hybride). Publiez
l'emploi du temps une fois complet pour qu'il soit visible côté étudiants
et enseignants.

## 11. Vie du semestre

- **Présences** (`/attendance`) : ouverture de feuille de présence par
  séance (génère un QR code + code de séance), pointage.
- **Campus numérique / LMS** (`/lms`) : espaces de cours, ressources,
  devoirs, forums, quiz.
- **Classes virtuelles** (`/virtual-classes`) : sessions BigBlueButton
  (nécessite `BBB_SERVER_URL`/`BBB_SECRET` configurés côté backend).
- **Communication** (`/communication`) : annonces, messagerie, notifications.

## 12. Évaluations & délibérations

`Évaluations` (`/evaluation`) : saisie des notes (CC + Examen) par
enseignant, validation par le responsable pédagogique
(`/responsable/grades-validation`), publication. Résultats calculés
automatiquement (moyenne UE pondérée par crédits EC, compensation à deux
passes selon le règlement LMD, moyenne semestrielle, GPA) — voir
`docs/GUIDE_JURY_FONCTIONNALITES.md` §8 pour le détail des formules.
Génération du PV de délibération et des relevés de notes PDF une fois les
résultats calculés.

## 13. Finance

`Finance` (`/finance`) : génération de factures (à partir des types de
frais créés en étape 6), enregistrement des paiements (caisse ou Mobile
Money via CinetPay — nécessite `CINETPAY_API_KEY`/`CINETPAY_SITE_ID`),
validation (`/finance/payments`), journal de caisse, bourses et
exonérations.

## 14. Documents & bibliothèque

`Documents` (`/documents`) : génération de certificats de scolarité,
fiches d'inscription, cartes étudiant, convocations, diplômes — tous
vérifiables publiquement via QR code (`/verify/{code}`).
`Bibliothèque` (`/bibliothecaire`) : catalogue, emprunts, réservations.

---

## Récapitulatif — ordre de dépendance

```
Université → Faculté → Département                         (Django admin)
      ↓
Année académique + Règlement LMD                            (Django admin)
      ↓
Comptes du personnel (scolarité, financier, responsable...)  (interface)
      ↓
Programme → Semestres → UE → EC (maquette)                   (interface)
      ↓                              ↘
Salles                          Types de frais                (interface / admin)
      ↓                              ↓
Candidatures → Décisions → Inscriptions → Groupes             (interface / API)
      ↓
Affectations pédagogiques (enseignant ↔ EC)                   (interface)
      ↓
Emploi du temps                                                (interface)
      ↓
Vie du semestre : présences, LMS, notes, finance, documents    (interface)
```

## Remarque — page de candidature en ligne manquante

L'étape 7 (candidature) n'a pas de formulaire dédié côté candidat dans le
frontend actuel — seul le traitement côté personnel existe. C'est le
principal manque identifié pour un déploiement réel en autonomie complète
(un candidat externe ne peut pas s'inscrire lui-même sans qu'un membre du
personnel crée d'abord son compte). À prioriser si l'établissement doit
ouvrir les candidatures au grand public.
