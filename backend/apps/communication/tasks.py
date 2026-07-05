"""
Tâches Celery pour le module Communication
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Notification, Announcement


@shared_task
def archive_old_notifications():
    """
    Archive les notifications lues de plus de 30 jours
    """
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    old_notifications = Notification.objects.filter(
        is_read=True,
        read_at__lt=thirty_days_ago,
        is_archived=False
    )
    
    count = old_notifications.update(is_archived=True)
    
    return {
        'archived_notifications': count,
        'cutoff_date': thirty_days_ago.isoformat()
    }


@shared_task
def delete_archived_notifications():
    """
    Supprime les notifications archivées de plus de 6 mois
    """
    six_months_ago = timezone.now() - timedelta(days=180)
    
    deleted = Notification.objects.filter(
        is_archived=True,
        created_at__lt=six_months_ago
    ).delete()
    
    return {
        'deleted_notifications': deleted[0] if deleted else 0,
        'cutoff_date': six_months_ago.isoformat()
    }


@shared_task
def send_daily_digest():
    """
    Envoie un résumé quotidien des notifications non lues
    """
    from django.contrib.auth import get_user_model
    from django.core.mail import send_mail
    from django.conf import settings
    
    User = get_user_model()
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    
    users_with_unread = User.objects.filter(
        is_active=True,
        notifications_received__is_read=False,
        notifications_received__created_at__date=yesterday
    ).distinct()
    
    emails_sent = 0
    for user in users_with_unread:
        unread_count = user.notifications_received.filter(
            is_read=False,
            created_at__date=yesterday
        ).count()
        
        if unread_count > 0 and user.email:
            try:
                send_mail(
                    subject=f'TIRAHOU - {unread_count} notification(s) non lue(s)',
                    message=f'Bonjour {user.get_full_name()},\n\n'
                           f'Vous avez {unread_count} notification(s) non lue(s) sur TIRAHOU.\n'
                           f'Connectez-vous pour les consulter.\n\n'
                           f'Cordialement,\nL\'équipe TIRAHOU',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
                emails_sent += 1
            except Exception:
                pass
    
    return {
        'users_notified': emails_sent,
        'date': yesterday.isoformat()
    }


@shared_task
def cleanup_expired_announcements():
    """
    Archive les annonces expirées
    """
    today = timezone.now().date()
    
    expired = Announcement.objects.filter(
        expires_at__lt=today,
        is_active=True
    )
    
    count = expired.update(is_active=False)
    
    return {
        'expired_announcements': count,
        'date': today.isoformat()
    }


@shared_task
def send_bulk_notification(user_ids, title, message, notification_type='system', priority='medium'):
    """
    Envoie une notification à plusieurs utilisateurs
    """
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    users = User.objects.filter(id__in=user_ids, is_active=True)
    
    notifications = [
        Notification(
            recipient=user,
            title=title,
            message=message,
            notification_type=notification_type,
            priority=priority
        )
        for user in users
    ]
    
    Notification.objects.bulk_create(notifications)
    
    return {
        'notifications_sent': len(notifications),
        'user_count': users.count()
    }


@shared_task
def mark_old_notifications_as_read():
    """
    Marque automatiquement comme lues les notifications de plus de 90 jours
    """
    ninety_days_ago = timezone.now() - timedelta(days=90)
    
    old_unread = Notification.objects.filter(
        is_read=False,
        created_at__lt=ninety_days_ago,
        priority__in=['low', 'medium']  # Ne pas auto-lire les priorités high
    )
    
    count = old_unread.update(
        is_read=True,
        read_at=timezone.now()
    )
    
    return {
        'auto_read_notifications': count,
        'cutoff_date': ninety_days_ago.isoformat()
    }
