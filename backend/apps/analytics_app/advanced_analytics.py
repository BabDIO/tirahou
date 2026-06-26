"""
Analyses avancées et prédictions pour le tableau de bord
"""
from django.db.models import Avg, Count, Q, F, Sum
from django.utils import timezone
from datetime import timedelta
from apps.people.models import Student
from apps.enrollment.models import AdminEnrollment, PedaEnrollment
from apps.evaluation.models import SemesterResult, Grade
from apps.attendance.models import AttendanceRecord
from apps.lms.models import StudentProgress, AssignmentSubmission
from .models import EngagementScore


def predict_student_success(student_id):
    """Prédiction de réussite basée sur plusieurs indicateurs"""
    try:
        student = Student.objects.get(id=student_id)
        
        # Indicateurs
        avg_grade = Grade.objects.filter(
            enrollment__admin_enrollment__student=student
        ).aggregate(avg=Avg('score'))['avg'] or 0
        
        attendance_rate = AttendanceRecord.objects.filter(
            student=student, status='present'
        ).count() / max(AttendanceRecord.objects.filter(student=student).count(), 1) * 100
        
        engagement = EngagementScore.objects.filter(
            student=student
        ).aggregate(avg=Avg('engagement_score'))['avg'] or 0
        
        completion = StudentProgress.objects.filter(
            student=student
        ).aggregate(avg=Avg('completion_rate'))['avg'] or 0
        
        # Score prédictif (pondéré)
        prediction_score = (
            avg_grade * 0.4 +
            attendance_rate * 0.3 +
            engagement * 0.2 +
            completion * 0.1
        )
        
        # Classification
        if prediction_score >= 75:
            risk_level = 'faible'
            success_probability = 'Élevée (>80%)'
        elif prediction_score >= 60:
            risk_level = 'moyen'
            success_probability = 'Moyenne (60-80%)'
        elif prediction_score >= 45:
            risk_level = 'eleve'
            success_probability = 'Faible (40-60%)'
        else:
            risk_level = 'critique'
            success_probability = 'Très faible (<40%)'
        
        return {
            'student_id': student_id,
            'prediction_score': round(prediction_score, 2),
            'risk_level': risk_level,
            'success_probability': success_probability,
            'indicators': {
                'avg_grade': round(avg_grade, 2),
                'attendance_rate': round(attendance_rate, 2),
                'engagement_score': round(engagement, 2),
                'completion_rate': round(completion, 2),
            }
        }
    except Student.DoesNotExist:
        return None


def get_cohort_analysis(academic_year_id=None):
    """Analyse comparative des cohortes"""
    qs = AdminEnrollment.objects.filter(status='validee')
    if academic_year_id:
        qs = qs.filter(academic_year_id=academic_year_id)
    
    return {
        'total_enrolled': qs.count(),
        'by_program': list(qs.values('program__name').annotate(count=Count('id')).order_by('-count')[:10]),
        'by_level': list(qs.values('level').annotate(count=Count('id'))),
        'retention_rate': _calculate_retention_rate(academic_year_id),
        'graduation_rate': _calculate_graduation_rate(academic_year_id),
    }


def _calculate_retention_rate(academic_year_id):
    """Taux de rétention (étudiants qui continuent)"""
    if not academic_year_id:
        return 0
    
    current_students = AdminEnrollment.objects.filter(
        academic_year_id=academic_year_id, status='validee'
    ).count()
    
    # Étudiants de l'année précédente
    from apps.academic.models import AcademicYear
    try:
        current_year = AcademicYear.objects.get(id=academic_year_id)
        previous_year = AcademicYear.objects.filter(
            start_date__lt=current_year.start_date
        ).order_by('-start_date').first()
        
        if previous_year:
            previous_students = AdminEnrollment.objects.filter(
                academic_year=previous_year, status='validee'
            ).count()
            
            if previous_students > 0:
                return round((current_students / previous_students) * 100, 2)
    except:
        pass
    
    return 0


def _calculate_graduation_rate(academic_year_id):
    """Taux de diplomation"""
    if not academic_year_id:
        return 0
    
    graduated = SemesterResult.objects.filter(
        academic_year_id=academic_year_id,
        decision__in=['admis', 'admis_avec_mention']
    ).count()
    
    total = SemesterResult.objects.filter(
        academic_year_id=academic_year_id
    ).count()
    
    return round((graduated / max(total, 1)) * 100, 2)


def get_performance_trends(days=30):
    """Tendances de performance sur N jours"""
    since = timezone.now() - timedelta(days=days)
    
    # Évolution des notes
    grades_trend = Grade.objects.filter(
        created_at__gte=since
    ).extra(
        select={'day': 'date(created_at)'}
    ).values('day').annotate(
        avg_score=Avg('score'),
        count=Count('id')
    ).order_by('day')
    
    # Évolution de l'assiduité
    attendance_trend = AttendanceRecord.objects.filter(
        created_at__gte=since
    ).extra(
        select={'day': 'date(created_at)'}
    ).values('day').annotate(
        present=Count('id', filter=Q(status='present')),
        total=Count('id')
    ).order_by('day')
    
    # Évolution engagement LMS
    lms_trend = StudentProgress.objects.filter(
        updated_at__gte=since
    ).extra(
        select={'day': 'date(updated_at)'}
    ).values('day').annotate(
        avg_completion=Avg('completion_rate')
    ).order_by('day')
    
    return {
        'grades': list(grades_trend),
        'attendance': list(attendance_trend),
        'lms_engagement': list(lms_trend),
    }


def get_top_performers(limit=10):
    """Top étudiants par performance globale"""
    students = Student.objects.filter(is_active=True).annotate(
        avg_grade=Avg('admin_enrollments__peda_enrollments__grades__score'),
        attendance_count=Count('attendance_records', filter=Q(attendance_records__status='present')),
        engagement_avg=Avg('engagement_scores__engagement_score')
    ).order_by('-avg_grade')[:limit]
    
    return [{
        'id': s.id,
        'name': s.user.get_full_name(),
        'student_id': s.student_id,
        'avg_grade': round(s.avg_grade or 0, 2),
        'attendance_count': s.attendance_count,
        'engagement_score': round(s.engagement_avg or 0, 2),
    } for s in students]


def get_at_risk_students_detailed():
    """Liste détaillée des étudiants à risque avec recommandations"""
    at_risk = EngagementScore.objects.filter(
        dropout_risk__in=['eleve', 'critique']
    ).select_related('student', 'course_space').order_by('-dropout_risk', 'engagement_score')
    
    results = []
    for score in at_risk:
        # Analyse détaillée
        student = score.student
        
        # Dernière connexion
        last_activity = student.learning_activities.order_by('-timestamp').first()
        days_inactive = (timezone.now() - last_activity.timestamp).days if last_activity else 999
        
        # Recommandations
        recommendations = []
        if score.connection_count < 5:
            recommendations.append("Faible fréquence de connexion")
        if score.completion_rate < 30:
            recommendations.append("Taux de complétion très faible")
        if score.assignments_submitted == 0:
            recommendations.append("Aucun devoir soumis")
        if days_inactive > 7:
            recommendations.append(f"Inactif depuis {days_inactive} jours")
        
        results.append({
            'student_id': student.id,
            'student_name': student.user.get_full_name(),
            'student_number': student.student_id,
            'course': score.course_space.title,
            'risk_level': score.dropout_risk,
            'engagement_score': float(score.engagement_score),
            'completion_rate': float(score.completion_rate),
            'days_inactive': days_inactive,
            'recommendations': recommendations,
            'contact_email': student.user.email,
        })
    
    return results
