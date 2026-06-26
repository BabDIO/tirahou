from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('internships', views.InternshipViewSet)
router.register('theses', views.ThesisViewSet)
router.register('defenses', views.DefenseViewSet)

urlpatterns = [path('', include(router.urls))]
