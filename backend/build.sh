#!/usr/bin/env bash
# Build script for Render.com deployment
set -o errexit

echo "=== Installing dependencies ==="
pip install -r requirements.txt

echo "=== Collecting static files ==="
DJANGO_SETTINGS_MODULE=config.settings_production python manage.py collectstatic --no-input

echo "=== Running database migrations ==="
DJANGO_SETTINGS_MODULE=config.settings_production python manage.py migrate

echo "=== Build complete ==="
