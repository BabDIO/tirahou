"""
Notifications (temps réel via WebSocket + email/SMS/push en repli), annonces, messagerie interne, forums. Voir consumers.py/signals.py pour le mécanisme de push temps réel.
"""
from django.apps import AppConfig

class UcommunicationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.communication'

    def ready(self):
        from . import signals  # noqa: F401
