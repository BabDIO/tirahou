-- ============================================================================
-- Corrige un contournement silencieux de Row-Level Security en production.
--
-- Contexte : DATABASE_URL sur Render utilise le rôle "postgres" (superuser)
-- pour la connexion applicative Django. Un superuser PostgreSQL contourne
-- TOUJOURS Row-Level Security, quelle que soit la politique en place —
-- comportement PostgreSQL non contournable, documenté dans apps/core/rls.py.
-- Résultat concret : les policies RLS sur grades/invoices (isolation
-- étudiant A / étudiant B, voir apps/core/migrations/0002_...) n'ont jamais
-- eu d'effet réel en production depuis leur mise en place.
--
-- Ce script crée un rôle applicatif SANS privilège superuser, avec les
-- droits nécessaires (DML + DDL sur le schéma public, pour que les
-- migrations Django continuent de fonctionner avec cette même connexion).
-- Comme la migration 0002 utilise déjà FORCE ROW LEVEL SECURITY, RLS
-- s'appliquera correctement à ce rôle même s'il devient propriétaire des
-- tables (FORCE s'applique aussi au propriétaire — seul un vrai superuser
-- reste exempté).
--
-- À exécuter UNE FOIS avec la connexion superuser actuelle (celle déjà
-- dans DATABASE_URL), par exemple :
--   psql "postgresql://postgres:MOT_DE_PASSE_ACTUEL@HOST/tirahoudb" -f create_limited_db_role.sql
--
-- Remplacer CHANGE_ME_STRONG_PASSWORD ci-dessous par un mot de passe fort
-- AVANT d'exécuter (ne jamais commiter ce fichier avec un vrai mot de passe
-- dedans — le laisser en placeholder dans git).
-- ============================================================================

CREATE ROLE tirahou_app WITH
    LOGIN
    PASSWORD 'CHANGE_ME_STRONG_PASSWORD'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOBYPASSRLS;

GRANT CONNECT ON DATABASE tirahoudb TO tirahou_app;

-- CREATE nécessaire pour que `python manage.py migrate` (lancé par build.sh
-- avec cette même DATABASE_URL) puisse continuer à créer/modifier des tables.
GRANT ALL PRIVILEGES ON SCHEMA public TO tirahou_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tirahou_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tirahou_app;

-- Pour les objets déjà existants créés par un autre rôle plus tard (rare
-- avec ce setup, mais évite une régression silencieuse).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tirahou_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tirahou_app;

-- Vérification rapide : doit renvoyer tirahou_app | f (rolsuper=false).
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'tirahou_app';
