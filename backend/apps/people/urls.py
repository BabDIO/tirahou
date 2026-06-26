from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('students', views.StudentViewSet)
router.register('teachers', views.TeacherViewSet)
router.register('admin-staff', views.AdminStaffViewSet)

urlpatterns = [path('', include(router.urls))]
