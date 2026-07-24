"""
Programmes/filières et leur découpage LMD : Unités d'Enseignement (UE) et Éléments Constitutifs (EC), crédits, coefficients.
"""
from django.apps import AppConfig

class UprogramsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.programs'
