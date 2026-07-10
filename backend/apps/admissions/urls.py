from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('applications', views.ApplicationViewSet)
router.register('application-documents', views.ApplicationDocumentViewSet)

urlpatterns = [
    path('admissions/check-result/', views.check_admission_result, name='check_admission_result'),
    path('', include(router.urls)),
]
