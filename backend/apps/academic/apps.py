"""
Structure académique générique : années académiques, niveaux, semestres — modélisée pour rester réutilisable d'un établissement/programme à l'autre sans changement de code.
"""
from django.apps import AppConfig

class UacademicConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.academic'
