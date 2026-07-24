"""
Inscriptions administratives (paiement des frais, validation du dossier) et pédagogiques (choix des UE/EC par semestre).
"""
from django.apps import AppConfig

class UenrollmentConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.enrollment'
