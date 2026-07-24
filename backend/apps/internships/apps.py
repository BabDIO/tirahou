"""
Stages et mémoires/thèses de fin d'études : suivi, dépôt du rapport/mémoire final, détection anti-plagiat optionnelle.
"""
from django.apps import AppConfig

class UinternshipsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.internships'
