#!/usr/bin/env bash
# Build script for Render.com deployment
set -o errexit

echo "=== Installing dependencies ==="
pip install -r requirements.txt

echo "=== Collecting static files ==="
DJANGO_SETTINGS_MODULE=config.settings_production python manage.py collectstatic --no-input

echo "=== Running database migrations ==="
DJANGO_SETTINGS_MODULE=config.settings_production python manage.py migrate

echo "=== Seeding demo accounts ==="
DJANGO_SETTINGS_MODULE=config.settings_production python create_test_users.py

echo "=== Seeding academic structure & demo data ==="
# Sans ce script, aucun University/Faculty n'existe jamais en production
# (create_test_users.py ne crée que les comptes) — ex.: la création d'une
# faculté échouait car Faculty.university n'avait rien à pointer. Les 3
# scripts sont idempotents (get_or_create), donc sans risque à chaque
# redéploiement — même schéma que docker-compose.yml pour le dev local.
# Crée aussi les 13 rôles (create_test_users.py n'en crée que 7) — doit
# donc passer AVANT seed_permissions, qui a besoin des rôles
# chef_departement/tuteur pour leur accorder leurs droits.
DJANGO_SETTINGS_MODULE=config.settings_production python seed_demo_data.py

echo "=== Seeding RBAC permissions ==="
# Sans ça, HasModulePermission (evaluation/finance/accounts) n'a aucune
# RolePermission à vérifier et bloque tout le monde sauf super_admin —
# ex.: un enseignant recevait 403 sur /exam-sessions/. Idempotent.
DJANGO_SETTINGS_MODULE=config.settings_production python manage.py seed_permissions

echo "=== Seeding cours de démonstration ==="
DJANGO_SETTINGS_MODULE=config.settings_production python manage.py shell < create_test_courses.py

echo "=== Build complete ==="
