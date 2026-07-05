from celery import shared_task
from django.utils import timezone
from datetime import timedelta

from .models import VirtualClassSession, SessionParticipant
from apps.communication.models import Notification


@shared_task(bind=True)
def send_upcoming_session_notifications(self, minutes_before=10, window_minutes=1):
    """Envoie une notification interne aux utilisateurs pour les sessions qui commencent
    dans `minutes_before` minutes. Cherche les sessions planifiées dont le début est
    dans la fenêtre [now+minutes_before, now+minutes_before+window_minutes).
    """
    now = timezone.now()
    start_from = now + timedelta(minutes=minutes_before)
    start_to = start_from + timedelta(minutes=window_minutes)

    sessions = VirtualClassSession.objects.filter(
        status='planifiee',
        scheduled_start__gte=start_from,
        scheduled_start__lt=start_to,
    ).select_related('course_space')

    created = 0
    for s in sessions:
        # recipients: course teachers, enrolled students (user), and explicitly added participants
        recipients = set()
        # teachers
        if s.course_space:
            for t in s.course_space.teachers.all():
                recipients.add(t)
            for stud in s.course_space.enrolled_students.all():
                if hasattr(stud, 'user') and stud.user:
                    recipients.add(stud.user)

        # participants already registered
        for p in SessionParticipant.objects.filter(session=s).select_related('user'):
            recipients.add(p.user)

        for user in recipients:
            # avoid duplicate reminders for same session+recipient: check action_url
            action_url = f"/virtual-classes/{s.id}"
            exists = Notification.objects.filter(recipient=user, action_url=action_url, type='rappel').exists()
            if exists:
                continue

            Notification.objects.create(
                recipient=user,
                type='rappel',
                channel='interne',
                priority='normal',
                title=f"Rappel : {s.title} démarre bientôt",
                message=f"La séance '{s.title}' du cours {getattr(s.course_space, 'title', '')} commence à {s.scheduled_start.astimezone(timezone.get_current_timezone()).strftime('%H:%M')}.",
                action_url=action_url,
                action_label='Rejoindre la séance',
                is_sent=True,
                sent_at=timezone.now(),
                extra_data={'session_id': s.id}
            )
            created += 1

    return {'notifs_created': created, 'checked_sessions': sessions.count()}


@shared_task
def check_upcoming_sessions():
    """
    Vérifie les sessions à venir et envoie des notifications
    """
    # Appeler la tâche existante pour 10 minutes avant
    send_upcoming_session_notifications.delay(minutes_before=10)
    
    # Appeler également pour 30 minutes avant
    send_upcoming_session_notifications.delay(minutes_before=30)
    
    return {'status': 'notifications_queued'}


@shared_task
def auto_end_stale_sessions():
    """
    Termine automatiquement les sessions qui sont "en_cours" depuis trop longtemps
    """
    now = timezone.now()
    max_duration = timedelta(hours=4)  # Session max 4 heures
    
    stale_sessions = VirtualClassSession.objects.filter(
        status='en_cours',
        actual_start__lt=now - max_duration
    )
    
    count = 0
    for session in stale_sessions:
        session.status = 'terminee'
        session.actual_end = now
        session.save()
        
        # Notifier les participants
        participants = SessionParticipant.objects.filter(session=session)
        for participant in participants:
            Notification.objects.create(
                recipient=participant.user,
                type='info',
                channel='interne',
                priority='normal',
                title=f"Session terminée automatiquement",
                message=f"La session '{session.title}' a été terminée automatiquement après {max_duration.seconds // 3600}h.",
                action_url=f"/virtual-classes/{session.id}",
                is_sent=True,
                sent_at=now
            )
        count += 1
    
    return {
        'auto_ended_sessions': count,
        'max_duration_hours': max_duration.seconds // 3600
    }


@shared_task
def cleanup_old_session_recordings():
    """
    Archive ou supprime les enregistrements de sessions anciennes (> 1 an)
    """
    one_year_ago = timezone.now() - timedelta(days=365)
    
    old_sessions = VirtualClassSession.objects.filter(
        actual_end__lt=one_year_ago,
        recording_url__isnull=False
    )
    
    count = 0
    for session in old_sessions:
        # Dans un cas réel, on supprimerait le fichier du stockage
        # Pour l'instant, on vide juste l'URL
        session.recording_url = None
        session.save()
        count += 1
    
    return {
        'archived_recordings': count,
        'cutoff_date': one_year_ago.isoformat()
    }


@shared_task
def generate_session_statistics():
    """
    Génère des statistiques sur les sessions virtuelles
    """
    from django.db.models import Count, Avg, Q
    
    today = timezone.now()
    month_ago = today - timedelta(days=30)
    
    # Sessions du dernier mois
    recent_sessions = VirtualClassSession.objects.filter(
        scheduled_start__gte=month_ago
    )
    
    stats = {
        'total_sessions': recent_sessions.count(),
        'completed_sessions': recent_sessions.filter(status='terminee').count(),
        'cancelled_sessions': recent_sessions.filter(status='annulee').count(),
        'avg_participants': SessionParticipant.objects.filter(
            session__scheduled_start__gte=month_ago
        ).values('session').annotate(
            count=Count('id')
        ).aggregate(avg=Avg('count'))['avg'] or 0,
        'recorded_sessions': recent_sessions.filter(
            is_recorded=True,
            recording_url__isnull=False
        ).count(),
        'period': f'{month_ago.date()} to {today.date()}'
    }
    
    return stats


@shared_task
def send_session_summary_email(session_id):
    """
    Envoie un email récapitulatif après une session
    """
    try:
        session = VirtualClassSession.objects.get(id=session_id)
    except VirtualClassSession.DoesNotExist:
        return {'error': 'Session not found'}
    
    if session.status != 'terminee':
        return {'error': 'Session not completed'}
    
    participants = SessionParticipant.objects.filter(session=session)
    participant_count = participants.count()
    present_count = participants.filter(is_present=True).count()
    
    # Créer des notifications pour tous les participants
    for participant in participants:
        duration = (session.actual_end - session.actual_start).seconds // 60 if session.actual_end else 0
        
        message = f"Récapitulatif de la session '{session.title}':\n"
        message += f"- Durée: {duration} minutes\n"
        message += f"- Participants: {present_count}/{participant_count}\n"
        
        if session.recording_url:
            message += f"- Enregistrement disponible"
        
        Notification.objects.create(
            recipient=participant.user,
            type='info',
            channel='interne',
            priority='normal',
            title=f"Récapitulatif : {session.title}",
            message=message,
            action_url=session.recording_url or f"/virtual-classes/{session.id}",
            action_label='Voir l\'enregistrement' if session.recording_url else 'Voir les détails',
            is_sent=True,
            sent_at=timezone.now()
        )
    
    return {
        'session_id': session_id,
        'notifications_sent': participant_count,
        'present_count': present_count
    }
