"""
Classes virtuelles hybrides, multi-fournisseurs (BigBlueButton, Jitsi, Zoom, Meet, Teams).
"""
from django.apps import AppConfig

class UvirtualUclassConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.virtual_class'
