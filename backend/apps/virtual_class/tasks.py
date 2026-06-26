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
