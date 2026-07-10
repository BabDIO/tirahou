"""
Tâches Celery pour le module Évaluation — rappels d'examens.
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import ExamSession
from apps.communication.models import Notification


@shared_task
def send_exam_reminders():
    """
    Envoie un rappel aux étudiants inscrits dont une session d'examen
    démarre dans 3 jours.
    """
    from apps.people.models import Student

    target_date = timezone.now().date() + timedelta(days=3)
    upcoming_sessions = ExamSession.objects.filter(start_date=target_date).select_related('semester')

    count = 0
    for session in upcoming_sessions:
        students = Student.objects.filter(
            admin_enrollments__peda_enrollments__semester=session.semester,
            admin_enrollments__status='validee',
        ).distinct()
        for student in students:
            Notification.objects.create(
                recipient=student.user,
                title="Examen à venir",
                message=(
                    f"La session « {session.get_session_type_display()} » de {session.semester} "
                    f"débute le {session.start_date.strftime('%d/%m/%Y')}. Préparez-vous !"
                ),
                type='rappel',
                priority='high',
                icon='calendar',
                color='amber',
                action_url='/my-schedule',
            )
            count += 1

    return {'reminders_sent': count, 'sessions': upcoming_sessions.count()}
