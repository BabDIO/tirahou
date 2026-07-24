"""
Base transverse partagée par toutes les autres apps : BaseModel (UUID + created_at/updated_at/is_active), middleware Row-Level Security PostgreSQL, exceptions et permissions RBAC de base.
"""
from django.apps import AppConfig

class UcoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
