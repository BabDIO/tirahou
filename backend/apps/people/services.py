"""
Services métier pour la gestion des personnes (étudiants, enseignants, personnel)
"""
from django.db.models import Q
from .models import Student, Teacher, AdminStaff


class StudentService:

    @staticmethod
    def search_students(query: str, **filters):
        """Recherche multi-critères sur les étudiants."""
        qs = Student.objects.filter(is_active=True).select_related('user', 'current_program', 'current_year')
        if query:
            qs = qs.filter(
                Q(student_id__icontains=query) |
                Q(user__first_name__icontains=query) |
                Q(user__last_name__icontains=query) |
                Q(user__email__icontains=query)
            )
        for key, val in filters.items():
            if val:
                qs = qs.filter(**{key: val})
        return qs

    @staticmethod
    def get_student_full_profile(student_id: str):
        """Récupère le profil complet d'un étudiant avec toutes ses relations."""
        try:
            return Student.objects.select_related(
                'user', 'current_program__department__faculty__university', 'current_year'
            ).prefetch_related(
                'admin_enrollments__peda_enrollments',
                'invoices__payments',
                'grades__ec__ue',
                'absence_summaries__course_space',
            ).get(id=student_id, is_active=True)
        except Student.DoesNotExist:
            return None

    @staticmethod
    def update_student_status(student: Student, new_status: str, updated_by=None):
        """Met à jour le statut d'un étudiant avec validation."""
        valid_transitions = {
            'candidat': ['admis', 'refuse'],
            'admis': ['inscrit', 'desiste'],
            'inscrit': ['reinscrit', 'diplome', 'abandonne', 'exclu', 'suspendu'],
            'reinscrit': ['reinscrit', 'diplome', 'abandonne', 'exclu', 'suspendu'],
            'suspendu': ['inscrit', 'exclu'],
        }
        allowed = valid_transitions.get(student.status, [])
        if new_status not in allowed and new_status != student.status:
            raise ValueError(f"Transition invalide : {student.status} → {new_status}")
        student.status = new_status
        student.save(update_fields=['status', 'updated_at'])
        return student

    @staticmethod
    def get_academic_history(student: Student):
        """Retourne l'historique académique structuré d'un étudiant."""
        from apps.enrollment.models import AdminEnrollment, PedaEnrollment
        from apps.evaluation.models import SemesterResult

        enrollments = AdminEnrollment.objects.filter(
            student=student, is_active=True
        ).select_related('program', 'academic_year').order_by('-academic_year__start_date')

        results = SemesterResult.objects.filter(
            student=student, published=True
        ).select_related('semester__program', 'exam_session').order_by('-semester__number')

        return {
            'enrollments': list(enrollments.values(
                'id', 'enrollment_number', 'program__name', 'academic_year__label',
                'type', 'status', 'payment_validated', 'created_at'
            )),
            'semester_results': list(results.values(
                'id', 'semester__label', 'average', 'credits_obtained',
                'total_credits', 'decision', 'mention', 'gpa', 'rank', 'published_at'
            )),
        }


class TeacherService:

    @staticmethod
    def get_teacher_load(teacher: Teacher, academic_year=None):
        """Calcule la charge horaire d'un enseignant."""
        from apps.scheduling_app.models import ScheduledSession
        from django.db.models import Sum
        from datetime import timedelta

        qs = ScheduledSession.objects.filter(
            teacher=teacher.user, status='realise'
        )
        if academic_year:
            qs = qs.filter(academic_year=academic_year)

        total_minutes = sum(
            int((s.end_datetime - s.start_datetime).total_seconds() / 60)
            for s in qs
        )
        total_hours = round(total_minutes / 60, 1)
        quota = teacher.weekly_hours_quota * 15  # 15 semaines par semestre

        return {
            'total_hours_done': total_hours,
            'weekly_quota': teacher.weekly_quota,
            'semester_quota': quota,
            'overload_hours': max(0, total_hours - quota),
        }

    @staticmethod
    def get_teacher_courses(teacher: Teacher, academic_year=None):
        """Retourne les cours d'un enseignant."""
        from apps.lms.models import CourseSpace
        qs = CourseSpace.objects.filter(
            teachers=teacher.user, is_active=True
        ).select_related('ue__semester__program', 'academic_year')
        if academic_year:
            qs = qs.filter(academic_year=academic_year)
        return qs
