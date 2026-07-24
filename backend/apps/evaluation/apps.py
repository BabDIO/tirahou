"""
Notes, calcul des moyennes et compensation entre EC d'une même UE selon les règles LMD, délibérations de jury, réclamations.
"""
from django.apps import AppConfig

class UevaluationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.evaluation'
