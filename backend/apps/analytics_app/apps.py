"""
Analytics éducatifs prédictifs : score d'engagement, détection précoce du risque de décrochage, statistiques institutionnelles. Voir advanced_analytics.py pour le modèle de scoring et sa calibration.
"""
from django.apps import AppConfig

class UanalyticsUappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.analytics_app'
