from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('students', views.StudentViewSet)
router.register('teachers', views.TeacherViewSet)
router.register('teacher-availabilities', views.TeacherAvailabilityViewSet)
router.register('admin-staff', views.AdminStaffViewSet)
router.register('parent-guardians', views.ParentGuardianViewSet)

urlpatterns = [
    path('student/dashboard/', views.student_dashboard, name='student-dashboard'),
    path('', include(router.urls)),
]
