"""
Facturation, paiements (dont mobile money), bourses/exonérations, journal de caisse.
"""
from django.apps import AppConfig

class UfinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.finance'
