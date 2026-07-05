"""
Tâches Celery pour le module Accounts
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken


@shared_task
def cleanup_expired_tokens():
    """
    Nettoie les tokens JWT expirés de la blacklist
    """
    # Supprimer les tokens expirés depuis plus de 7 jours
    seven_days_ago = timezone.now() - timedelta(days=7)
    
    expired_tokens = OutstandingToken.objects.filter(
        expires_at__lt=seven_days_ago
    )
    
    count = expired_tokens.count()
    expired_tokens.delete()
    
    return {
        'deleted_tokens': count,
        'cutoff_date': seven_days_ago.isoformat()
    }


@shared_task
def cleanup_blacklisted_tokens():
    """
    Nettoie les tokens blacklistés anciens
    """
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    old_blacklisted = BlacklistedToken.objects.filter(
        blacklisted_at__lt=thirty_days_ago
    )
    
    count = old_blacklisted.count()
    old_blacklisted.delete()
    
    return {
        'deleted_blacklisted': count,
        'cutoff_date': thirty_days_ago.isoformat()
    }


@shared_task
def send_password_expiry_reminders():
    """
    Envoie des rappels pour les mots de passe qui expirent bientôt
    (Si la politique de mot de passe est activée)
    """
    from django.contrib.auth import get_user_model
    from apps.communication.models import Notification
    
    User = get_user_model()
    
    # Supposons une expiration de mot de passe à 90 jours
    ninety_days_ago = timezone.now() - timedelta(days=90)
    seven_days_from_expiry = timezone.now() - timedelta(days=83)
    
    users_to_remind = User.objects.filter(
        last_password_change__lte=seven_days_from_expiry,
        last_password_change__gt=ninety_days_ago,
        is_active=True
    )
    
    count = 0
    for user in users_to_remind:
        # Vérifier si pas déjà notifié aujourd'hui
        today = timezone.now().date()
        already_notified = Notification.objects.filter(
            recipient=user,
            title__icontains='mot de passe',
            created_at__date=today
        ).exists()
        
        if not already_notified:
            Notification.objects.create(
                recipient=user,
                title="Expiration du mot de passe",
                message="Votre mot de passe expirera dans 7 jours. "
                       "Veuillez le changer pour maintenir la sécurité de votre compte.",
                notification_type='system',
                priority='medium'
            )
            count += 1
    
    return {'reminders_sent': count}


@shared_task
def deactivate_inactive_users():
    """
    Désactive les utilisateurs inactifs depuis plus d'un an
    """
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    one_year_ago = timezone.now() - timedelta(days=365)
    
    inactive_users = User.objects.filter(
        last_login__lt=one_year_ago,
        is_active=True,
        is_staff=False,  # Ne pas désactiver le staff
        is_superuser=False
    )
    
    count = inactive_users.count()
    inactive_users.update(is_active=False)
    
    return {
        'deactivated_users': count,
        'inactivity_threshold_days': 365
    }


@shared_task
def generate_user_activity_report():
    """
    Génère un rapport d'activité utilisateur
    """
    from django.contrib.auth import get_user_model
    from apps.lms.models import ActivityLog
    
    User = get_user_model()
    today = timezone.now()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # Utilisateurs actifs
    active_week = ActivityLog.objects.filter(
        created_at__gte=week_ago
    ).values('user').distinct().count()
    
    active_month = ActivityLog.objects.filter(
        created_at__gte=month_ago
    ).values('user').distinct().count()
    
    # Nouveaux utilisateurs
    new_users_week = User.objects.filter(
        date_joined__gte=week_ago
    ).count()
    
    new_users_month = User.objects.filter(
        date_joined__gte=month_ago
    ).count()
    
    # Total utilisateurs
    total_users = User.objects.filter(is_active=True).count()
    
    return {
        'total_active_users': total_users,
        'active_last_week': active_week,
        'active_last_month': active_month,
        'new_users_week': new_users_week,
        'new_users_month': new_users_month,
        'engagement_rate_week': round((active_week / total_users * 100), 2) if total_users > 0 else 0,
        'engagement_rate_month': round((active_month / total_users * 100), 2) if total_users > 0 else 0
    }
