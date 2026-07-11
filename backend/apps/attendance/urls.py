from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('attendance-sheets', views.AttendanceSheetViewSet)
router.register('attendance-records', views.AttendanceRecordViewSet)
router.register('absence-summaries', views.AbsenceSummaryViewSet)

urlpatterns = [
    path('student/attendance/', views.student_attendance, name='student-attendance'),
    path('student/attendance/stats/', views.student_attendance_stats, name='student-attendance-stats'),
    path('', include(router.urls)),
]
