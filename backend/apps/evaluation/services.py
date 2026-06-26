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
            student=student
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
        return {
            'count': agg['count'],
            'average': round(float(agg['average'] or 0), 2),
            'min_score': float(first.final_grade) if first else 0,
            'max_score': float(last.final_grade) if last else 0,
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
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from decimal import Decimal
from .models import Grade, UEResult, SemesterResult, GradeContest, ExamSession
from apps.enrollment.models import PedaEnrollment
from apps.people.models import Student
from apps.programs.models import EC, UE
from apps.communication.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)


class GradeService:
    """Service pour la gestion des notes"""
    
    @staticmethod
    def get_student_grades(student, exam_session=None):
        """Récupérer les notes d'un étudiant"""
        qs = Grade.objects.filter(
            enrollment__admin_enrollment__student=student
        ).select_related('ec', 'exam_session', 'enrollment')
        
        if exam_session:
            qs = qs.filter(exam_session=exam_session)
        
        return qs.order_by('ec__name')
    
    @staticmethod
    def get_teacher_grades(teacher, ec_id=None, exam_session_id=None):
        """Récupérer les notes saisies par un enseignant"""
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
        """Saisir une note"""
        try:
            # Récupérer l'inscription pédagogique
            enrollment = PedaEnrollment.objects.get(
                admin_enrollment__student=student,
                semester=ec.ue.semester
            )
        except PedaEnrollment.DoesNotExist:
            logger.error(f"Inscription non trouvée pour {student} - {ec}")
            return None
        
        # Créer ou mettre à jour la note
        grade, created = Grade.objects.get_or_create(
            enrollment=enrollment,
            ec=ec,
            exam_session=exam_session,
            defaults={
                'cc_grade': Decimal(str(cc_grade)) if cc_grade else None,
                'exam_grade': Decimal(str(exam_grade)) if exam_grade else None,
                'is_absent': is_absent,
                'appreciation': appreciation,
                'entered_by': entered_by,
                'status': 'en_attente'
            }
        )
        
        if not created:
            # Mettre à jour
            if cc_grade is not None:
                grade.cc_grade = Decimal(str(cc_grade))
            if exam_grade is not None:
                grade.exam_grade = Decimal(str(exam_grade))
            grade.is_absent = is_absent
            grade.appreciation = appreciation
            grade.entered_by = entered_by
        
        # Calculer la note finale si les deux notes sont présentes
        if grade.cc_grade is not None and grade.exam_grade is not None and not is_absent:
            cc_weight = grade.cc_weight or Decimal('0.4')
            grade.score = grade.cc_grade * cc_weight + grade.exam_grade * (1 - cc_weight)
            
            # Déterminer l'appréciation automatique si pas fournie
            if not appreciation:
                if grade.score >= 16:
                    grade.appreciation = 'Très bien'
                elif grade.score >= 14:
                    grade.appreciation = 'Bien'
                elif grade.score >= 12:
                    grade.appreciation = 'Assez bien'
                elif grade.score >= 10:
                    grade.appreciation = 'Passable'
                else:
                    grade.appreciation = 'Insuffisant'
        
        grade.save()
        
        logger.info(f"Note saisie: {student} - {ec.name} = {grade.score}")
        return grade
    
    @staticmethod
    def validate_grades_bulk(grade_ids, validator):
        """Valider des notes en masse"""
        try:
            grades = Grade.objects.filter(
                id__in=grade_ids,
                status='en_attente'
            )
            
            count = 0
            for grade in grades:
                grade.status = 'validee'
                grade.validated_by = validator
                grade.validated_at = timezone.now()
                grade.save()
                count += 1
            
            logger.info(f"Validation en masse: {count} notes validées par {validator}")
            return count
            
        except Exception as e:
            logger.error(f"Erreur validation en masse: {e}")
            return 0
    
    @staticmethod
    def calculate_class_statistics(ec, exam_session):
        """Calculer les statistiques d'une classe"""
        grades = Grade.objects.filter(
            ec=ec,
            exam_session=exam_session,
            score__isnull=False
        )
        
        if not grades.exists():
            return None
        
        stats = grades.aggregate(
            count=Count('id'),
            average=Avg('score'),
            min_score=grades.order_by('score').first().score,
            max_score=grades.order_by('-score').first().score
        )
        
        # Répartition par mention
        stats['mentions'] = {
            'tres_bien': grades.filter(score__gte=16).count(),
            'bien': grades.filter(score__gte=14, score__lt=16).count(),
            'assez_bien': grades.filter(score__gte=12, score__lt=14).count(),
            'passable': grades.filter(score__gte=10, score__lt=12).count(),
            'insuffisant': grades.filter(score__lt=10).count(),
        }
        
        # Taux de réussite
        stats['success_rate'] = (grades.filter(score__gte=10).count() / stats['count']) * 100
        
        return stats
    
    @staticmethod
    def submit_grade_contest(grade_id, student, reason):
        """Soumettre une réclamation de note"""
        try:
            grade = Grade.objects.get(
                id=grade_id,
                enrollment__admin_enrollment__student=student,
                status='validee'
            )
        except Grade.DoesNotExist:
            return None, "Note non trouvée ou non validée"
        
        # Vérifier si une réclamation existe déjà
        existing = GradeContest.objects.filter(
            grade=grade,
            student=student,
            status='en_attente'
        ).exists()
        
        if existing:
            return None, "Une réclamation est déjà en cours pour cette note"
        
        contest = GradeContest.objects.create(
            grade=grade,
            student=student,
            reason=reason,
            status='en_attente'
        )
        
        logger.info(f"Réclamation soumise: {student} - {grade.ec.name}")
        return contest, "Réclamation soumise avec succès"


class ResultService:
    """Service pour la gestion des résultats"""
    
    @staticmethod
    def get_student_transcript(student, academic_year_id=None):
        """Générer le relevé de notes d'un étudiant"""
        try:
            enrollments = PedaEnrollment.objects.filter(
                admin_enrollment__student=student
            ).select_related('admin_enrollment', 'semester', 'level')
            
            if academic_year_id:
                enrollments = enrollments.filter(
                    admin_enrollment__academic_year_id=academic_year_id
                )
            
            transcript = {
                'student': {
                    'name': student.user.get_full_name(),
                    'student_id': student.student_id,
                    'email': student.user.email,
                },
                'semesters': []
            }
            
            for enrollment in enrollments:
                # Résultat semestriel
                semester_result = SemesterResult.objects.filter(
                    enrollment=enrollment,
                    published=True
                ).first()
                
                if not semester_result:
                    continue
                
                # Notes des EC
                grades = Grade.objects.filter(
                    enrollment=enrollment,
                    status='validee'
                ).select_related('ec')
                
                semester_data = {
                    'semester': enrollment.semester.name,
                    'level': enrollment.level,
                    'average': float(semester_result.average) if semester_result.average else 0,
                    'gpa': float(semester_result.gpa) if semester_result.gpa else 0,
                    'credits_obtained': semester_result.credits_obtained,
                    'total_credits': semester_result.total_credits,
                    'decision': semester_result.decision,
                    'mention': semester_result.mention,
                    'grades': []
                }
                
                for grade in grades:
                    semester_data['grades'].append({
                        'ec_name': grade.ec.name,
                        'ec_code': grade.ec.code,
                        'credits': grade.ec.credits,
                        'cc_grade': float(grade.cc_grade) if grade.cc_grade else None,
                        'exam_grade': float(grade.exam_grade) if grade.exam_grade else None,
                        'final_grade': float(grade.score) if grade.score else None,
                        'appreciation': grade.appreciation,
                    })
                
                transcript['semesters'].append(semester_data)
            
            return transcript
            
        except Exception as e:
            logger.error(f"Erreur génération relevé: {e}")
            return None
    
    @staticmethod
    def calculate_ue_results(exam_session):
        """Calculer tous les résultats d'UE pour une session"""
        try:
            # Récupérer toutes les UE avec des notes validées
            ues = UE.objects.filter(
                ecs__grades__exam_session=exam_session,
                ecs__grades__status='validee'
            ).distinct()
            
            count = 0
            for ue in ues:
                # Récupérer toutes les inscriptions pour cette UE
                enrollments = PedaEnrollment.objects.filter(
                    semester=ue.semester
                ).distinct()
                
                for enrollment in enrollments:
                    # Calculer le résultat UE pour cette inscription
                    ec_grades = Grade.objects.filter(
                        enrollment=enrollment,
                        ec__ue=ue,
                        exam_session=exam_session,
                        status='validee'
                    )
                    
                    if not ec_grades.exists():
                        continue
                    
                    # Calculer la moyenne pondérée
                    total_credits = 0
                    weighted_sum = 0
                    
                    for grade in ec_grades:
                        credits = grade.ec.credits or 1
                        total_credits += credits
                        if grade.score:
                            weighted_sum += float(grade.score) * credits
                    
                    if total_credits == 0:
                        continue
                    
                    average = weighted_sum / total_credits
                    
                    # Créer ou mettre à jour le résultat UE
                    ue_result, created = UEResult.objects.get_or_create(
                        enrollment=enrollment,
                        ue=ue,
                        exam_session=exam_session,
                        defaults={
                            'average': Decimal(str(average)),
                            'credits_obtained': total_credits if average >= 10 else 0,
                            'status': 'validee'
                        }
                    )
                    
                    if not created:
                        ue_result.average = Decimal(str(average))
                        ue_result.credits_obtained = total_credits if average >= 10 else 0
                        ue_result.status = 'validee'
                    
                    # Déterminer la mention
                    if average >= 16:
                        ue_result.mention = 'Très bien'
                    elif average >= 14:
                        ue_result.mention = 'Bien'
                    elif average >= 12:
                        ue_result.mention = 'Assez bien'
                    elif average >= 10:
                        ue_result.mention = 'Passable'
                    else:
                        ue_result.mention = 'Ajourné'
                    
                    ue_result.save()
                    count += 1
            
            logger.info(f"Calcul UE: {count} résultats calculés")
            return count
            
        except Exception as e:
            logger.error(f"Erreur calcul UE: {e}")
            return 0
    
    @staticmethod
    def calculate_semester_results(exam_session):
        """Calculer tous les résultats semestriels pour une session"""
        try:
            # Récupérer toutes les inscriptions avec des résultats UE
            enrollments = PedaEnrollment.objects.filter(
                ue_results__exam_session=exam_session,
                ue_results__status='validee'
            ).distinct()
            
            count = 0
            for enrollment in enrollments:
                # Récupérer tous les résultats UE
                ue_results = UEResult.objects.filter(
                    enrollment=enrollment,
                    exam_session=exam_session,
                    status='validee'
                )
                
                if not ue_results.exists():
                    continue
                
                # Calculer la moyenne générale
                total_credits = 0
                weighted_sum = 0
                credits_obtained = 0
                
                for ue_result in ue_results:
                    credits = ue_result.ue.credits or 1
                    total_credits += credits
                    weighted_sum += float(ue_result.average) * credits
                    credits_obtained += ue_result.credits_obtained
                
                if total_credits == 0:
                    continue
                
                average = weighted_sum / total_credits
                
                # Créer ou mettre à jour le résultat semestriel
                semester_result, created = SemesterResult.objects.get_or_create(
                    enrollment=enrollment,
                    exam_session=exam_session,
                    defaults={
                        'average': Decimal(str(average)),
                        'credits_obtained': credits_obtained,
                        'total_credits': total_credits,
                        'status': 'validee'
                    }
                )
                
                if not created:
                    semester_result.average = Decimal(str(average))
                    semester_result.credits_obtained = credits_obtained
                    semester_result.total_credits = total_credits
                    semester_result.status = 'validee'
                
                # Déterminer la décision et mention
                if average >= 10 and credits_obtained >= total_credits * 0.8:
                    if average >= 16:
                        semester_result.decision = 'admis_avec_mention'
                        semester_result.mention = 'Très bien'
                    elif average >= 14:
                        semester_result.decision = 'admis_avec_mention'
                        semester_result.mention = 'Bien'
                    elif average >= 12:
                        semester_result.decision = 'admis_avec_mention'
                        semester_result.mention = 'Assez bien'
                    else:
                        semester_result.decision = 'admis'
                        semester_result.mention = 'Passable'
                else:
                    semester_result.decision = 'ajourne'
                    semester_result.mention = 'Ajourné'
                
                # Calculer le GPA (sur 4.0)
                if average >= 16:
                    semester_result.gpa = Decimal('4.0')
                elif average >= 14:
                    semester_result.gpa = Decimal('3.5')
                elif average >= 12:
                    semester_result.gpa = Decimal('3.0')
                elif average >= 10:
                    semester_result.gpa = Decimal('2.5')
                else:
                    semester_result.gpa = Decimal('0.0')
                
                semester_result.save()
                count += 1
            
            logger.info(f"Calcul semestre: {count} résultats calculés")
            return count
            
        except Exception as e:
            logger.error(f"Erreur calcul semestre: {e}")
            return 0
    
    @staticmethod
    def publish_semester_results(exam_session):
        """Publier tous les résultats semestriels d'une session"""
        try:
            results = SemesterResult.objects.filter(
                exam_session=exam_session,
                status='validee',
                published=False
            )
            
            count = 0
            for result in results:
                result.published = True
                result.published_at = timezone.now()
                result.save()
                
                # Envoyer notification à l'étudiant
                NotificationService.send_notification(
                    recipient_id=result.enrollment.admin_enrollment.student.user.id,
                    title="Résultats publiés",
                    message=f"Vos résultats sont disponibles. Moyenne: {result.average}/20",
                    notif_type='resultat',
                    priority='high',
                    channel='both',
                    action_url='/my-grades',
                    action_label='Voir mes résultats',
                    icon='award',
                    color='emerald'
                )
                
                count += 1
            
            logger.info(f"Publication: {count} résultats publiés")
            return count
            
        except Exception as e:
            logger.error(f"Erreur publication: {e}")
            return 0


def compute_semester_results(semester_id, session_id):
    """Calculer les résultats semestriels (alias pour compatibilité)"""
    try:
        exam_session = ExamSession.objects.get(id=session_id)
        return ResultService.calculate_semester_results(exam_session)
    except ExamSession.DoesNotExist:
        return 0


def get_student_transcript(student, academic_year_id=None):
    """Générer le relevé de notes (alias pour compatibilité)"""
    return ResultService.get_student_transcript(student, academic_year_id)