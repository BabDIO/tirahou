"""
Services pour la gestion des notes et résultats
"""
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from decimal import Decimal
from .models import Grade, UEResult, SemesterResult, GradeContest, ExamSession
from apps.people.models import Student
from apps.communication.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)


class GradeService:
    """Service pour la gestion des notes"""

    @staticmethod
    def get_student_grades(student, exam_session=None):
        qs = Grade.objects.filter(
            student=student,
            status='publiee',
        ).select_related('ec', 'exam_session')
        if exam_session:
            qs = qs.filter(exam_session=exam_session)
        return qs.order_by('ec__name')

    @staticmethod
    def get_teacher_grades(teacher, ec_id=None, exam_session_id=None):
        qs = Grade.objects.filter(
            entered_by=teacher.user
        ).select_related('student', 'ec', 'exam_session')
        if ec_id:
            qs = qs.filter(ec_id=ec_id)
        if exam_session_id:
            qs = qs.filter(exam_session_id=exam_session_id)
        return qs.order_by('student__student_id')

    @staticmethod
    def enter_grade(student, ec, exam_session, cc_grade=None, exam_grade=None,
                    entered_by=None, is_absent=False, appreciation=''):
        grade, created = Grade.objects.get_or_create(
            student=student,
            ec=ec,
            exam_session=exam_session,
            defaults={
                'cc_grade': Decimal(str(cc_grade)) if cc_grade is not None else None,
                'exam_grade': Decimal(str(exam_grade)) if exam_grade is not None else None,
                'is_absent': is_absent,
                'appreciation': appreciation,
                'entered_by': entered_by,
                'status': 'saisie',
            }
        )
        if not created:
            if cc_grade is not None:
                grade.cc_grade = Decimal(str(cc_grade))
            if exam_grade is not None:
                grade.exam_grade = Decimal(str(exam_grade))
            grade.is_absent = is_absent
            grade.appreciation = appreciation
            grade.entered_by = entered_by
        grade.save()  # déclenche calculate_final_grade via save()
        logger.info(f"Note saisie: {student} - {ec.name} = {grade.final_grade}")
        return grade

    @staticmethod
    def validate_grades_bulk(grade_ids, validator):
        grades = Grade.objects.filter(id__in=grade_ids, status='saisie')
        count = 0
        for grade in grades:
            grade.status = 'validee'
            grade.validated_by = validator
            grade.validated_at = timezone.now()
            grade.save()
            count += 1
        logger.info(f"Validation en masse: {count} notes validées par {validator}")
        return count

    @staticmethod
    def calculate_class_statistics(ec, exam_session):
        grades = Grade.objects.filter(
            ec=ec, exam_session=exam_session,
            final_grade__isnull=False, is_absent=False
        )
        if not grades.exists():
            return None
        agg = grades.aggregate(count=Count('id'), average=Avg('final_grade'))
        first = grades.order_by('final_grade').first()
        last = grades.order_by('-final_grade').first()
        min_val = float(first.final_grade) if first else 0
        max_val = float(last.final_grade) if last else 0
        return {
            'count': agg['count'],
            'average': round(float(agg['average'] or 0), 2),
            'min_score': min_val,
            'max_score': max_val,
            'min': min_val,
            'max': max_val,
            'absent_count': Grade.objects.filter(ec=ec, exam_session=exam_session, is_absent=True).count(),
            'success_rate': round(grades.filter(final_grade__gte=10).count() / agg['count'] * 100, 2),
            'mentions': {
                'tres_bien': grades.filter(final_grade__gte=16).count(),
                'bien': grades.filter(final_grade__gte=14, final_grade__lt=16).count(),
                'assez_bien': grades.filter(final_grade__gte=12, final_grade__lt=14).count(),
                'passable': grades.filter(final_grade__gte=10, final_grade__lt=12).count(),
                'insuffisant': grades.filter(final_grade__lt=10).count(),
            }
        }

    @staticmethod
    def submit_grade_contest(grade_id, student, reason):
        try:
            grade = Grade.objects.get(id=grade_id, student=student, status__in=['validee', 'publiee'])
        except Grade.DoesNotExist:
            return None, "Note non trouvée ou non validée"
        if GradeContest.objects.filter(grade=grade, student=student, status='soumise').exists():
            return None, "Une réclamation est déjà en cours pour cette note"
        contest = GradeContest.objects.create(grade=grade, student=student, reason=reason)
        return contest, "Réclamation soumise avec succès"


class ResultService:
    """Service pour les résultats UE et semestriels"""

    @staticmethod
    def get_student_transcript(student, academic_year_id=None):
        try:
            qs = SemesterResult.objects.filter(student=student, published=True).select_related('semester', 'exam_session')
            if academic_year_id:
                qs = qs.filter(exam_session__academic_year_id=academic_year_id)
            transcript = {
                'student': {
                    'name': student.user.get_full_name(),
                    'student_id': student.student_id,
                    'email': student.user.email,
                },
                'semesters': []
            }
            for sr in qs:
                grades = Grade.objects.filter(
                    student=student,
                    exam_session=sr.exam_session,
                    ec__ue__semester=sr.semester,
                    status__in=['validee', 'publiee']
                ).select_related('ec')
                transcript['semesters'].append({
                    'semester': sr.semester.name,
                    'average': float(sr.average) if sr.average else 0,
                    'gpa': float(sr.gpa) if sr.gpa else 0,
                    'credits_obtained': sr.credits_obtained,
                    'total_credits': sr.total_credits,
                    'decision': sr.decision,
                    'mention': sr.mention,
                    'rank': sr.rank,
                    'grades': [{
                        'ec_name': g.ec.name,
                        'ec_code': g.ec.code,
                        'final_grade': float(g.final_grade) if g.final_grade else None,
                        'appreciation': g.appreciation,
                    } for g in grades]
                })
            return transcript
        except Exception as e:
            logger.error(f"Erreur relevé: {e}")
            return None

    @staticmethod
    def calculate_ue_results(exam_session):
        from apps.programs.models import UE
        count = 0
        ues = UE.objects.filter(ecs__grades__exam_session=exam_session).distinct()
        for ue in ues:
            students = Student.objects.filter(
                grades__ec__ue=ue, grades__exam_session=exam_session
            ).distinct()
            for student in students:
                ue_result = UEResult.objects.filter(student=student, ue=ue, exam_session=exam_session).first()
                if not ue_result:
                    ue_result = UEResult(student=student, ue=ue, exam_session=exam_session)
                ue_result.calculate_ue_average()
                count += 1
        logger.info(f"Calcul UE: {count} résultats")
        return count

    @staticmethod
    def calculate_semester_results(exam_session):
        count = 0
        students = Student.objects.filter(
            ue_results__exam_session=exam_session
        ).distinct()
        for student in students:
            sr = SemesterResult.objects.filter(
                student=student, exam_session=exam_session
            ).first()
            if not sr:
                sr = SemesterResult(student=student, semester=exam_session.semester, exam_session=exam_session)
            sr.calculate_semester_average()
            count += 1
        logger.info(f"Calcul semestre: {count} résultats")
        return count

    @staticmethod
    def publish_semester_results(exam_session):
        results = SemesterResult.objects.filter(exam_session=exam_session, published=False)
        count = 0
        for r in results:
            r.publish_results()
            count += 1
        logger.info(f"Publication: {count} résultats")
        return count


def compute_semester_results(semester_id, session_id):
    """Alias pour compatibilité avec pdf_views"""
    try:
        exam_session = ExamSession.objects.get(id=session_id)
        return ResultService.calculate_semester_results(exam_session)
    except ExamSession.DoesNotExist:
        return 0


def get_student_transcript(student, academic_year_id=None):
    """Alias pour compatibilité avec pdf_views"""
    return ResultService.get_student_transcript(student, academic_year_id)