"""
Endpoints utilitaires transverses qui ne rattachent à aucun domaine métier précis (health check, informations générales, statistiques globales).
"""
from django.apps import AppConfig

class UapiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.api'
