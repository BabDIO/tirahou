from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('exam-sessions', views.ExamSessionViewSet)
router.register('grades', views.GradeViewSet)
router.register('semester-results', views.SemesterResultViewSet)
router.register('juries', views.JuryViewSet)
router.register('grade-contests', views.GradeContestViewSet)
router.register('ue-results', views.UEResultViewSet, basename='ue-results')
router.register('exam-room-assignments', views.ExamRoomAssignmentViewSet)

urlpatterns = [
    path('evaluation/analytics/distribution/', views.grade_distribution, name='grade-distribution'),
    path('', include(router.urls)),
]
