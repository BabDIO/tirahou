from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('info/', views.api_info, name='api_info'),
    path('system-stats/', views.system_stats, name='system_stats'),
    path('search/', views.global_search, name='global_search'),
]
