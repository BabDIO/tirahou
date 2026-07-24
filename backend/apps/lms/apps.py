"""
Campus numérique : espaces de cours par EC, modules, ressources, devoirs, quiz — le LMS de la plateforme.
"""
from django.apps import AppConfig

class UlmsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.lms'
