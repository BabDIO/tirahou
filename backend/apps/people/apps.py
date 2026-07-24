"""
Profils métier des utilisateurs : Étudiant, Enseignant — distincts du compte User (apps.accounts), qui ne porte que l'authentification.
"""
from django.apps import AppConfig

class UpeopleConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.people'
