from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('programs', views.ProgramViewSet)
router.register('semesters', views.SemesterViewSet)
router.register('ues', views.UEViewSet)
router.register('ecs', views.ECViewSet)
router.register('groups', views.GroupViewSet)

urlpatterns = [
    path('responsable/dashboard/', views.responsable_dashboard, name='responsable-dashboard'),
    path('', include(router.urls)),
]
