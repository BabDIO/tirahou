"""
Bibliothèque : catalogue de documents, emprunts, réservations, notation, listes de lecture.
"""
from django.apps import AppConfig


class LibraryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.library'
    verbose_name = 'Bibliothèque Numérique'
