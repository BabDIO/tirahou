"""
Endpoints dédiés par acteur — montés sous /api/v1/evaluation/
"""
from django.urls import path
from . import views

urlpatterns = [
    # Export / template
    path('grades/export/',    views.export_grades,         name='eval-grades-export'),
    path('grades/template/',  views.grade_template,        name='eval-grades-template'),

    # ── Étudiant ──────────────────────────────────────────────
    path('student/grades/',   views.student_grades,        name='student-grades'),
    path('student/statistics/', views.student_statistics,  name='student-statistics'),
    path('student/transcript/', views.student_transcript,  name='student-transcript'),
    path('student/contest/',  views.submit_grade_contest,  name='submit-contest'),

    # ── Enseignant ────────────────────────────────────────────
    path('teacher/grades/',       views.teacher_grades,    name='teacher-grades'),
    path('teacher/statistics/',   views.class_statistics,  name='class-statistics'),
    path('teacher/enter-grade/',  views.enter_grade,       name='enter-grade'),

    # ── Responsable Pédagogique ───────────────────────────────
    path('admin/validate-bulk/',     views.validate_grades_bulk,      name='validate-bulk'),
    path('admin/calculate-ue/',      views.calculate_ue_results,      name='calculate-ue'),
    path('admin/calculate-semester/', views.calculate_semester_results, name='calculate-semester'),

    # ── Admin Scolarité ───────────────────────────────────────
    path('admin/publish-results/',   views.publish_semester_results,  name='publish-results'),
]
