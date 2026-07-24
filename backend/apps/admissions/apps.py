"""
Cycle de candidature : dossiers, pièces justificatives, décisions d'admission. Voir ADMISSIONS_STAFF_ROLES dans views.py pour qui peut traiter les dossiers des autres.
"""
from django.apps import AppConfig

class UadmissionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.admissions'
