"""
Gestion électronique de documents (GED) : pièces déposées par les étudiants (StudentDocument) et documents officiels générés par l'établissement (GeneratedDocument, PDF + QR code de vérification publique).
"""
from django.apps import AppConfig

class UdocumentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.documents'
