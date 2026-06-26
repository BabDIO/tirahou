"""
Service de gestion des notes avec calculs automatiques
"""
from django.db.models import Avg, Sum, Count, Q
from django.utils import timezone
from decimal import Decimal
from apps.evaluation.models import Grade, SemesterResult, UEResult
from apps.enrollment.models import PedaEnrollment
from apps.academic.models import EC, UE
from apps.communication.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)


class GradeService:
    """Service centralisé pour la gestion des notes"""
    
    @staticmethod
    def calculate_ec_grade(enrollment, ec, cc_grade=None, exam_grade=None, cc_weight=0.4):
        """Calculer la note finale d'un EC"""
        try:
            # Récupérer ou créer la note
            grade, created = Grade.objects.get_or_create(
                enrollment=enrollment,
                ec=ec,
                defaults={
                    'cc_grade': cc_grade,
                    'exam_grade': exam_grade,
                    'cc_weight': Decimal(str(cc_weight))
                }
            )
            
            if not created:
                # Mettre à jour les notes existantes
                if cc_grade is not None:
                    grade.cc_grade = Decimal(str(cc_grade))
                if exam_grade is not None:
                    grade.exam_grade = Decimal(str(exam_grade))
                grade.cc_weight = Decimal(str(cc_weight))
            
            # Calculer la note finale
            if grade.cc_grade is not None and grade.exam_grade is not None:
                grade.score = (
                    grade.cc_grade * grade.cc_weight + 
                    grade.exam_grade * (1 - grade.cc_weight)
                )
                grade.status = 'validee'
                
                # Déterminer l'appréciation
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
            
            # Envoyer notification si note complète
            if grade.status == 'validee':
                NotificationService.send_grade_notification(
                    student=enrollment.admin_enrollment.student,
                    course=ec.name,
                    grade=grade.score
                )
            
            logger.info(f"Note EC calculée: {enrollment.admin_enrollment.student} - {ec.name} = {grade.score}")
            return grade
            
        except Exception as e:
            logger.error(f"Erreur calcul note EC: {e}")
            return None
    
    @staticmethod
    def calculate_ue_result(enrollment, ue):
        """Calculer le résultat d'une UE"""
        try:
            # Récupérer toutes les notes des EC de cette UE
            ec_grades = Grade.objects.filter(
                enrollment=enrollment,
                ec__ue=ue,
                status='validee'
            )
            
            if not ec_grades.exists():
                return None
            
            # Calculer la moyenne pondérée
            total_credits = 0
            weighted_sum = 0
            
            for grade in ec_grades:
                credits = grade.ec.credits or 1
                total_credits += credits
                weighted_sum += float(grade.score) * credits
            
            if total_credits == 0:
                return None
            
            average = weighted_sum / total_credits
            
            # Créer ou mettre à jour le résultat UE
            ue_result, created = UEResult.objects.get_or_create(
                enrollment=enrollment,
                ue=ue,
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
            
            logger.info(f"Résultat UE calculé: {enrollment.admin_enrollment.student} - {ue.name} = {average}")
            return ue_result
            
        except Exception as e:
            logger.error(f"Erreur calcul UE: {e}")
            return None
    
    @staticmethod
    def calculate_semester_result(enrollment):
        """Calculer le résultat semestriel"""
        try:
            # Récupérer tous les résultats UE du semestre
            ue_results = UEResult.objects.filter(
                enrollment=enrollment,
                status='validee'
            )
            
            if not ue_results.exists():
                return None
            
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
                return None
            
            average = weighted_sum / total_credits
            
            # Créer ou mettre à jour le résultat semestriel
            semester_result, created = SemesterResult.objects.get_or_create(
                enrollment=enrollment,
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
            
            logger.info(f"Résultat semestriel calculé: {enrollment.admin_enrollment.student} = {average}")
            return semester_result
            
        except Exception as e:
            logger.error(f"Erreur calcul semestre: {e}")
            return None
    
    @staticmethod
    def validate_grades_bulk(grade_ids, validator):
        """Valider des notes en masse"""
        try:
            grades = Grade.objects.filter(id__in=grade_ids, status='en_attente')
            validated_count = 0
            
            for grade in grades:
                grade.status = 'validee'
                grade.validated_by = validator
                grade.validated_at = timezone.now()
                grade.save()
                
                # Recalculer les résultats UE et semestriels
                GradeService.calculate_ue_result(grade.enrollment, grade.ec.ue)
                GradeService.calculate_semester_result(grade.enrollment)
                
                validated_count += 1
            
            logger.info(f"Validation en masse: {validated_count} notes validées")
            return validated_count
            
        except Exception as e:
            logger.error(f"Erreur validation en masse: {e}")
            return 0
    
    @staticmethod
    def publish_results(semester_results_ids, publisher):
        """Publier des résultats"""
        try:
            results = SemesterResult.objects.filter(
                id__in=semester_results_ids,
                status='validee',
                published=False
            )
            
            published_count = 0
            for result in results:
                result.published = True
                result.published_at = timezone.now()
                result.published_by = publisher
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
                
                published_count += 1
            
            logger.info(f"Publication: {published_count} résultats publiés")
            return published_count
            
        except Exception as e:
            logger.error(f"Erreur publication: {e}")
            return 0
    
    @staticmethod
    def get_student_transcript(student):
        """Générer le relevé de notes d'un étudiant"""
        try:
            # Récupérer toutes les inscriptions de l'étudiant
            enrollments = PedaEnrollment.objects.filter(
                admin_enrollment__student=student
            ).select_related('admin_enrollment', 'semester', 'level')
            
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
                
                # Résultats UE
                ue_results = UEResult.objects.filter(
                    enrollment=enrollment,
                    status='validee'
                ).select_related('ue')
                
                semester_data = {
                    'semester': enrollment.semester.name,
                    'level': enrollment.level,
                    'average': float(semester_result.average),
                    'gpa': float(semester_result.gpa),
                    'credits_obtained': semester_result.credits_obtained,
                    'total_credits': semester_result.total_credits,
                    'decision': semester_result.decision,
                    'mention': semester_result.mention,
                    'ues': []
                }
                
                for ue_result in ue_results:
                    # Notes EC de cette UE
                    ec_grades = Grade.objects.filter(
                        enrollment=enrollment,
                        ec__ue=ue_result.ue,
                        status='validee'
                    ).select_related('ec')
                    
                    ue_data = {
                        'name': ue_result.ue.name,
                        'code': ue_result.ue.code,
                        'credits': ue_result.ue.credits,
                        'average': float(ue_result.average),
                        'mention': ue_result.mention,
                        'ecs': []
                    }
                    
                    for grade in ec_grades:
                        ue_data['ecs'].append({
                            'name': grade.ec.name,
                            'code': grade.ec.code,
                            'credits': grade.ec.credits,
                            'cc_grade': float(grade.cc_grade) if grade.cc_grade else None,
                            'exam_grade': float(grade.exam_grade) if grade.exam_grade else None,
                            'final_grade': float(grade.score),
                            'appreciation': grade.appreciation,
                        })
                    
                    semester_data['ues'].append(ue_data)
                
                transcript['semesters'].append(semester_data)
            
            return transcript
            
        except Exception as e:
            logger.error(f"Erreur génération relevé: {e}")
            return None