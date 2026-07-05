"""
Tâches Celery pour le module Analytics
"""
from celery import shared_task
from django.utils import timezone
from django.db.models import Count, Avg, Q
from apps.people.models import Student
from apps.enrollment.models import Enrollment
from apps.evaluation.models import Grade
from apps.attendance.models import Attendance
from apps.lms.models import CourseEnrollment, ActivityLog


@shared_task
def calculate_daily_stats():
    """
    Calcule les statistiques quotidiennes de la plateforme
    """
    today = timezone.now().date()
    
    # Statistiques étudiants
    total_students = Student.objects.filter(is_active=True).count()
    active_students_today = ActivityLog.objects.filter(
        created_at__date=today,
        user__student__isnull=False
    ).values('user').distinct().count()
    
    # Statistiques inscriptions
    active_enrollments = Enrollment.objects.filter(
        status='actif'
    ).count()
    
    # Statistiques académiques
    avg_attendance = Attendance.objects.filter(
        date__date=today,
        status='present'
    ).count()
    
    # Statistiques LMS
    course_enrollments = CourseEnrollment.objects.filter(
        is_active=True
    ).count()
    
    # Moyenne générale
    avg_grade = Grade.objects.filter(
        final_grade__isnull=False
    ).aggregate(avg=Avg('final_grade'))['avg'] or 0
    
    stats = {
        'date': today.isoformat(),
        'total_students': total_students,
        'active_students': active_students_today,
        'active_enrollments': active_enrollments,
        'attendance_count': avg_attendance,
        'course_enrollments': course_enrollments,
        'average_grade': round(float(avg_grade), 2)
    }
    
    return stats


@shared_task
def detect_at_risk_students():
    """
    Détecte les étudiants à risque de décrochage
    """
    from apps.communication.models import Notification
    
    # Critères de risque:
    # 1. Moyenne < 10/20
    # 2. Taux de présence < 75%
    # 3. Pas d'activité LMS depuis 14 jours
    
    today = timezone.now()
    fourteen_days_ago = today - timezone.timedelta(days=14)
    
    at_risk_students = []
    
    # Étudiants avec mauvaise moyenne
    low_grade_students = Grade.objects.filter(
        final_grade__lt=10
    ).values('enrollment__student').annotate(
        avg_grade=Avg('final_grade')
    ).filter(avg_grade__lt=10)
    
    # Étudiants avec faible présence
    low_attendance_students = Student.objects.annotate(
        total_sessions=Count('enrollment__attendance'),
        present_sessions=Count('enrollment__attendance', filter=Q(enrollment__attendance__status='present'))
    ).filter(
        total_sessions__gt=0
    ).annotate(
        attendance_rate=100.0 * models.F('present_sessions') / models.F('total_sessions')
    ).filter(attendance_rate__lt=75)
    
    # Étudiants inactifs sur LMS
    inactive_students = Student.objects.exclude(
        user__activitylog__created_at__gte=fourteen_days_ago
    ).filter(is_active=True)
    
    # Combiner les résultats
    for student in inactive_students[:50]:  # Limiter à 50 par exécution
        # Vérifier si déjà notifié récemment
        recent_notification = Notification.objects.filter(
            recipient=student.user,
            notification_type='academic',
            title__icontains='risque',
            created_at__gte=today - timezone.timedelta(days=7)
        ).exists()
        
        if not recent_notification:
            Notification.objects.create(
                recipient=student.user,
                title="Suivi académique",
                message="Votre profil académique indique un risque de décrochage. "
                       "Nous vous invitons à contacter votre tuteur ou le service de scolarité.",
                notification_type='academic',
                priority='high'
            )
            at_risk_students.append(student.id)
    
    return {
        'at_risk_count': len(at_risk_students),
        'student_ids': at_risk_students
    }


@shared_task
def generate_weekly_report():
    """
    Génère un rapport hebdomadaire pour les administrateurs
    """
    today = timezone.now()
    week_ago = today - timezone.timedelta(days=7)
    
    # Nouvelles inscriptions
    new_enrollments = Enrollment.objects.filter(
        enrollment_date__gte=week_ago
    ).count()
    
    # Nouveaux étudiants
    new_students = Student.objects.filter(
        created_at__gte=week_ago
    ).count()
    
    # Paiements reçus
    from apps.finance.models import Payment
    payments_received = Payment.objects.filter(
        payment_date__gte=week_ago,
        status='valide'
    ).count()
    
    # Activité LMS
    lms_activity = ActivityLog.objects.filter(
        created_at__gte=week_ago
    ).count()
    
    report = {
        'period': f'{week_ago.date()} to {today.date()}',
        'new_enrollments': new_enrollments,
        'new_students': new_students,
        'payments_received': payments_received,
        'lms_activity': lms_activity
    }
    
    return report


@shared_task
def cleanup_old_analytics():
    """
    Nettoie les anciennes données d'analytics (> 2 ans)
    """
    two_years_ago = timezone.now() - timezone.timedelta(days=730)
    
    deleted_logs = ActivityLog.objects.filter(
        created_at__lt=two_years_ago
    ).delete()
    
    return {
        'deleted_activity_logs': deleted_logs[0] if deleted_logs else 0,
        'cutoff_date': two_years_ago.isoformat()
    }
