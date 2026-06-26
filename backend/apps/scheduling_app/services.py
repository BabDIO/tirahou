from django.db import transaction
from django.utils import timezone
from .models import ScheduledSession
from apps.communication.models import Notification
from apps.enrollment.models import PedaEnrollment


def switch_session_mode(session: ScheduledSession, new_mode: str, reason: str = '', user=None) -> ScheduledSession:
    """
    Bascule le mode d'une séance (présentiel ↔ distanciel ↔ hybride).
    Notifie automatiquement tous les étudiants inscrits.
    """
    old_mode = session.mode
    session.mode = new_mode
    if reason:
        session.notes = f"[Changement de mode: {old_mode} → {new_mode}] {reason}"
    session.save(update_fields=['mode', 'notes'])

    # Notifier les étudiants inscrits au groupe
    if session.group:
        peda_enrollments = PedaEnrollment.objects.filter(
            semester=session.ec.ue.semester,
            group=session.group,
            status='confirmee',
        ).select_related('admin_enrollment__student__user')

        mode_labels = {
            'presentiel': 'Présentiel',
            'distanciel_sync': 'Distanciel Synchrone',
            'distanciel_async': 'Distanciel Asynchrone',
            'hybride': 'Hybride',
        }

        notifications = []
        for peda in peda_enrollments:
            student = peda.admin_enrollment.student
            notifications.append(Notification(
                recipient=student.user,
                type='cours',
                channel='interne',
                title=f'Changement de mode — {session.ec.name}',
                message=(
                    f'La séance du {session.start_datetime.strftime("%d/%m/%Y à %H:%M")} '
                    f'({session.ec.code}) passe en mode '
                    f'{mode_labels.get(new_mode, new_mode)}.'
                    + (f' Raison : {reason}' if reason else '')
                ),
                action_url=f'/my-schedule',
            ))

        if notifications:
            Notification.objects.bulk_create(notifications)

    return session


def detect_room_conflicts(ec, start_dt, end_dt, room, exclude_session_id=None):
    """Détecte les conflits de salle pour une séance planifiée."""
    qs = ScheduledSession.objects.filter(
        room=room,
        start_datetime__lt=end_dt,
        end_datetime__gt=start_dt,
        status__in=['planifie', 'confirme'],
    )
    if exclude_session_id:
        qs = qs.exclude(id=exclude_session_id)
    return qs


def detect_teacher_conflicts(teacher, start_dt, end_dt, exclude_session_id=None):
    """Détecte les conflits d'enseignant pour une séance planifiée."""
    qs = ScheduledSession.objects.filter(
        teacher=teacher,
        start_datetime__lt=end_dt,
        end_datetime__gt=start_dt,
        status__in=['planifie', 'confirme'],
    )
    if exclude_session_id:
        qs = qs.exclude(id=exclude_session_id)
    return qs


def get_weekly_schedule(group, academic_year, week_start):
    """Retourne l'emploi du temps d'un groupe pour une semaine donnée."""
    from datetime import timedelta
    week_end = week_start + timedelta(days=7)
    return ScheduledSession.objects.filter(
        group=group,
        academic_year=academic_year,
        start_datetime__gte=week_start,
        start_datetime__lt=week_end,
        status__in=['planifie', 'confirme', 'realise'],
    ).select_related('ec__ue', 'teacher', 'room').order_by('start_datetime')
