"""
Marketplace de cours : contenu pédagogique vendu/acheté entre utilisateurs, indépendant du LMS institutionnel (apps.lms).
"""
from django.apps import AppConfig


class MarketplaceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.marketplace'
    verbose_name = 'Marketplace de Cours'
