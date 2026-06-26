from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('exam-sessions', views.ExamSessionViewSet)
router.register('grades', views.GradeViewSet)
router.register('semester-results', views.SemesterResultViewSet)
router.register('juries', views.JuryViewSet)
router.register('grade-contests', views.GradeContestViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('grades/export/', views.export_grades, name='grades-export'),
    path('grades/template/', views.grade_template, name='grades-template'),
    
    # AMÉLIORATIONS: Endpoints par acteur
    # ÉTUDIANT
    path('student/grades/', views.student_grades, name='student-grades'),
    path('student/transcript/', views.student_transcript, name='student-transcript'),
    path('student/contest/', views.submit_grade_contest, name='submit-contest'),
    
    # ENSEIGNANT
    path('teacher/grades/', views.teacher_grades, name='teacher-grades'),
    path('teacher/statistics/', views.class_statistics, name='class-statistics'),
    path('teacher/enter-grade/', views.enter_grade, name='enter-grade'),
    
    # RESPONSABLE PÉDAGOGIQUE
    path('admin/validate-bulk/', views.validate_grades_bulk, name='validate-bulk'),
    path('admin/calculate-ue/', views.calculate_ue_results, name='calculate-ue'),
    path('admin/calculate-semester/', views.calculate_semester_results, name='calculate-semester'),
    
    # ADMIN SCOLARITÉ
    path('admin/publish-results/', views.publish_semester_results, name='publish-results'),
]
