# TIRAHOU — Environnement de développement Docker

Fait tourner base de données, backend et frontend chacun dans son propre
conteneur, capables de communiquer entre eux. **Usage local uniquement** —
n'a aucun effet sur le déploiement en ligne (backend sur Render via
`Procfile`/`build.sh`, frontend sur Vercel via `vercel.json` ; ni l'un ni
l'autre ne lit les fichiers décrits ici).

## Démarrage

```bash
cp .env.example .env      # ajuster les valeurs si besoin
docker compose up --build
```

Au premier démarrage : Postgres s'initialise, le backend attend que la base
soit prête (`healthcheck`) puis enchaîne automatiquement `migrate` →
comptes de démo (`create_test_users.py`, un par rôle — voir
`docs/COMPTES_TEST.md`) → données réalistes (`seed_demo_data.py` : structure
académique, notes, finances, bibliothèque...) → contenu de cours
(`create_test_courses.py`) avant de démarrer le serveur de dev. Comptez 1 à 2
minutes la première fois (installation des dépendances Python/Node dans les
images), puis quelques secondes de plus pour le seed initial.

Les trois scripts de seed sont idempotents (`get_or_create`) : les rejouer à
chaque redémarrage du conteneur ne crée jamais de doublons, ils se contentent
de vérifier que les données de démo existent toujours. Pour désactiver le
seed automatique (démarrage plus rapide, base vide), voir la ligne `command`
commentée dans `docker-compose.yml`.

Une fois démarré :
- **Frontend** : http://localhost:3001 (mappé depuis le port 3000 du
  conteneur — évite un conflit si un autre serveur de dev tourne déjà sur
  le 3000 de la machine hôte)
- **Backend / API** : http://localhost:8001/api/v1
- **Admin Django** : http://localhost:8001/admin
- **PostgreSQL** : `localhost:5433` (mappé depuis le port 5432 du conteneur,
  pour ne pas entrer en conflit avec un Postgres déjà installé localement)

## Comment les conteneurs communiquent

- **backend → db** : via le réseau interne Docker créé automatiquement par
  Compose, en utilisant le nom du service comme hôte (`DB_HOST=db`, port
  5432 — le mapping `5433:5432` ne concerne que les connexions depuis la
  machine hôte, pas la communication entre conteneurs).
- **navigateur → frontend** : http://localhost:3001 (port mappé).
- **navigateur → backend** : http://localhost:8001 (port mappé). Le
  frontend n'appelle PAS le backend via le réseau interne Docker
  (`http://backend:8000`) parce que le code qui fait ces appels (axios)
  s'exécute dans le navigateur sur la machine hôte, pas dans le conteneur
  frontend — d'où `VITE_API_URL=http://localhost:8001/api/v1` dans
  `.env.example`.

## Commandes utiles

```bash
# Logs en direct d'un service
docker compose logs -f backend

# Ouvrir un shell Django dans le conteneur backend
docker compose exec backend python manage.py shell

# Comptes de démo + données de test déjà créés automatiquement au démarrage
# (voir "Démarrage" ci-dessus) — au besoin, les rejouer manuellement reste
# possible et sans danger (idempotent) :
docker compose exec backend python create_test_users.py
docker compose exec backend python seed_demo_data.py

# Se connecter à Postgres directement
docker compose exec db psql -U tirahou -d tirahoudb

# Tout arrêter
docker compose down

# Tout arrêter ET supprimer les données de la base (repart de zéro)
docker compose down -v
```

## Rechargement à chaud

Le code source (`./backend`, `./frontend`) est monté en volume dans les
conteneurs — modifier un fichier côté hôte est immédiatement visible dans
le conteneur (rechargement automatique de `runserver` et de Vite). Pas
besoin de reconstruire les images sauf après un changement dans
`requirements.txt` ou `package.json` (dans ce cas : `docker compose up --build`).

## Persistance des données

Les données Postgres vivent dans un volume Docker nommé (`tirahou_db_data`),
donc elles survivent à `docker compose down` (mais pas à `docker compose
down -v`, qui supprime aussi les volumes). Contrairement à l'environnement
Render actuel, ces données restent bien sur disque entre deux redémarrages
du conteneur.

## Différences volontaires avec la production

| | Docker (local) | Production |
|---|---|---|
| Backend | `config.settings` (DEBUG=True) via `runserver` | `config.settings_production` via `daphne` |
| PostgreSQL | 16 | 18 (Render) |
| Fichiers statiques | servis par Django (`DEBUG=True`) | WhiteNoise |
| Secrets | `.env` local, valeurs jetables | variables d'environnement Render/Vercel |

Ces différences sont volontaires : `settings_production.py` active des
en-têtes de sécurité (HSTS, cookies `Secure`) qui n'ont pas de sens en HTTP
local, et gêneraient le développement sans apporter de valeur.

## Row-Level Security : statut en local

`python manage.py verify_rls` (voir `apps/core/management/commands/`)
signale que le rôle `tirahou` est superuser — normal ici : l'image
Postgres officielle fait toujours du `POSTGRES_USER` fourni un superuser.
Sans enjeu en local (vous avez de toute façon un accès complet à votre
propre machine) ; c'est le même constat qui a motivé le correctif
appliqué en production, voir `backend/scripts/create_limited_db_role.sql`
si vous voulez reproduire un rôle non-superuser ici aussi.
