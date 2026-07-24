"""
Présences : feuilles d'émargement, pointage par QR code ou code de séance, alertes d'assiduité.
"""
from django.apps import AppConfig

class UattendanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.attendance'
