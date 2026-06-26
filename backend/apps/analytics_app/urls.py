from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .reporting import (
    export_students_excel, export_grades_excel,
    export_payments_csv, global_report,
)

router = DefaultRouter()
router.register('activities', views.LearningActivityViewSet)
router.register('engagement-scores', views.EngagementScoreViewSet)
router.register('dashboard-stats', views.DashboardStatViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.global_dashboard, name='global_dashboard'),
    path('report/', global_report, name='global_report'),
    path('export/students/', export_students_excel, name='export_students'),
    path('export/grades/', export_grades_excel, name='export_grades'),
    path('export/payments/', export_payments_csv, name='export_payments'),
    path('lms-stats/', views.lms_stats, name='lms_stats'),
    # AMÉLIORATIONS: Prédiction et analyse
    path('predict-success/', views.predict_student_success, name='predict_student_success'),
    path('students-at-risk/', views.students_at_risk, name='students_at_risk'),
]
