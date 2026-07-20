# Note de conception — Passage à une architecture multi-établissement (multi-tenant)

> Statut : **non implémenté**. Ce document explique pourquoi ce n'est pas un simple
> réglage, propose une trajectoire concrète, et identifie précisément ce qu'il
> faudrait modifier — pour pouvoir répondre avec précision si le jury pose la
> question, sans sur-promettre un chantier qui n'a pas été fait.

## 1. Pourquoi ce n'est pas trivial

TIRAHOU est aujourd'hui une architecture **mono-établissement** : une seule
installation (une seule base de données) sert une seule université. Le modèle
`University` existe déjà (`apps/academic/models.py`), mais il n'est utilisé que
comme **fiche d'identité** (nom, adresse, règlement LMD) — pas comme frontière
d'isolation des données. Rien n'empêche aujourd'hui une requête de traverser
plusieurs "universités" si plusieurs enregistrements `University` existaient
dans la même base (aucun modèle métier ne filtre par université).

Passer en multi-tenant, c'est garantir que chaque établissement client ne voit
**jamais** les données d'un autre — sur chaque requête, chaque export PDF,
chaque tâche asynchrone (Celery), chaque webhook. Cela touche la quasi-totalité
des 20 apps du projet, pas un module isolé.

## 2. Les trois approches possibles

| Approche | Isolation | Effort de migration | Coût opérationnel |
|---|---|---|---|
| **Base de données par tenant** | Maximale (physique) | Très élevé (routage de connexion dynamique) | Élevé (N bases à sauvegarder/migrer/monitorer) |
| **Schéma PostgreSQL par tenant** | Forte (logique, au niveau SQL) | Élevé (migrations à rejouer par schéma) | Moyen |
| **Schéma partagé + colonne `tenant_id`** | Applicative (+ RLS en renfort) | Modéré | Faible (une seule base à opérer) |

**Recommandation : schéma partagé + `tenant_id`, renforcé par PostgreSQL Row-Level
Security.** C'est l'approche qui capitalise directement sur deux éléments déjà
en place dans TIRAHOU :
- Le modèle `University` existe déjà comme candidat naturel de `tenant_id`.
- L'infrastructure RLS ajoutée en défense en profondeur sur `grades`/`invoices`
  (voir `apps/core/rls.py`, `docs/GUIDE_JURY_FONCTIONNALITES.md` §14) suit déjà
  exactement le pattern nécessaire (middleware transactionnel + variable de
  session PostgreSQL positionnée à l'authentification) — il suffirait d'ajouter
  une deuxième variable `app.current_tenant_id` à côté de `app.current_student_id`
  et une policy générique `tenant_id = current_setting('app.current_tenant_id')`
  sur les tables qui en ont besoin. La base technique n'est donc pas à
  inventer, seulement à étendre.

## 3. Ce qu'il faudrait concrètement changer

1. **Modèle** — ajouter un FK `university` (ou un modèle `Tenant` dédié, plus
   neutre si un établissement fédère plusieurs universités) sur les modèles
   racines qui n'en héritent pas déjà implicitement via une chaîne de FK
   (`Department → Faculty → University` existe déjà ; mais `User`, `Student`,
   `Teacher`, `Invoice`, `Grade`... n'ont aujourd'hui aucun chemin direct vers
   `University`). C'est le changement le plus large en surface : plusieurs
   dizaines de modèles, une migration de données pour rattacher l'existant à
   l'université actuelle (triviale tant qu'il n'y a qu'un seul tenant à migrer).
2. **Résolution du tenant** — un middleware qui détermine le tenant courant
   (sous-domaine `<etablissement>.tirahou.edu`, ou en-tête `X-Tenant-ID` pour
   l'app mobile) et le pose en variable de session PostgreSQL, sur le même
   principe que `PostgresRLSTransactionMiddleware`.
3. **RBAC** — `HasModulePermission` (`apps/accounts/permissions.py`) et chaque
   `get_queryset()` doivent scoper systématiquement par tenant en plus du rôle.
   Risque principal du chantier : un `get_queryset()` oublié qui laisserait
   filtrer une vue inter-tenant — c'est précisément ce que la RLS Postgres,
   étendue au tenant, neutraliserait comme filet de sécurité.
4. **Fichiers & documents générés** — séparer le stockage média par tenant
   (préfixe de chemin), et les documents PDF déjà signés (QR code) embarquant
   déjà `university_name` dynamiquement (`apps/documents/pdf_service.py`) —
   peu de changement à ce niveau, la fonction le fait déjà.
5. **Facturation & CinetPay** — un identifiant marchand CinetPay par
   établissement (le code actuel lit `CINETPAY_API_KEY` comme réglage global
   unique ; il faudrait le faire dépendre du tenant).
6. **Céléry / tâches planifiées** — toute tâche qui itère sur "tous les
   étudiants" doit itérer par tenant, pas globalement.

## 4. Ce qui ne changerait pas

- Le modèle LMD (Program/Semester/UE/EC) reste identique par établissement —
  c'est déjà une modélisation générique, réutilisable telle quelle par
  tenant.
- Le frontend React n'a besoin d'aucune adaptation structurelle : il consomme
  déjà l'API par token JWT sans connaître la notion de tenant ; le tenant
  serait résolu côté serveur à partir du sous-domaine ou d'un claim JWT.
- L'app mobile Expo n'a pas non plus à changer de logique, seulement à
  transmettre l'identifiant d'établissement sélectionné à la connexion.

## 5. Estimation

Chantier de l'ordre de **plusieurs semaines à temps plein** pour une bascule
complète et testée (migration de schéma, RBAC, tests de non-régression sur
les 20 apps, données de démonstration multi-tenant). Hors de portée d'un
mémoire dans le temps imparti — mais la voie est concrète, ancrée dans
l'architecture existante, et ne nécessite pas de réécriture : c'est une
extension, pas une refonte.
