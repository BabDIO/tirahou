"""
Authentification JWT, utilisateurs, rôles et permissions (RBAC). Point d'entrée pour tout ce qui touche identité/sécurité — voir permissions.py pour le contrôle d'accès fin par module.
"""
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
    verbose_name = 'Comptes & Authentification'
