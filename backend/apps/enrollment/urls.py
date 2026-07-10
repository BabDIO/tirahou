from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('admin-enrollments', views.AdminEnrollmentViewSet)
router.register('peda-enrollments', views.PedaEnrollmentViewSet)
router.register('ue-enrollments', views.UEEnrollmentViewSet)

urlpatterns = [
    path('enrollment/dashboard/', views.enrollment_dashboard, name='enrollment-dashboard'),
    path('', include(router.urls)),
]
