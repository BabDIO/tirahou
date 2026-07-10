"""
Service de gestion des notifications enrichies
"""
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models import Notification
from apps.accounts.models import User
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Service centralisé pour l'envoi de notifications"""
    
    @staticmethod
    def send_notification(
        recipient_id, 
        title, 
        message, 
        notif_type='info',
        priority='normal',
        channel='interne',
        action_url='',
        action_label='',
        icon='',
        color='',
        extra_data=None
    ):
        """Envoyer une notification enrichie"""
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            logger.error(f"Utilisateur {recipient_id} non trouvé")
            return None
        
        # Créer la notification
        notification = Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            type=notif_type,
            priority=priority,
            channel=channel,
            action_url=action_url,
            action_label=action_label,
            icon=icon,
            color=color,
            extra_data=extra_data or {},
            is_sent=True,
            sent_at=timezone.now()
        )
        
        # Envoyer par email si demandé
        if channel in ['email', 'both']:
            NotificationService._send_email(notification)

        # Envoyer par SMS si demandé (best-effort, no-op si Twilio non configuré)
        if channel in ['sms', 'both'] and getattr(recipient, 'phone', ''):
            try:
                from .sms import send_sms
                send_sms(recipient.phone, f"[TIRAHOU] {title} — {message}"[:300])
            except Exception as e:
                logger.warning(f"SMS non envoyé: {e}")

        # Notification push web (best-effort, silencieuse si aucun abonnement)
        try:
            from .webpush import send_web_push
            send_web_push(recipient, title, message, url=action_url or '/notifications', icon=None)
        except Exception as e:
            logger.warning(f"Push web non envoyé: {e}")

        logger.info(f"Notification envoyée à {recipient.email}: {title}")
        return notification
    
    @staticmethod
    def _send_email(notification):
        """Envoyer la notification par email"""
        try:
            send_mail(
                subject=f"[TIRAHOU] {notification.title}",
                message=notification.message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification.recipient.email],
                fail_silently=False,
            )
            logger.info(f"Email envoyé à {notification.recipient.email}")
        except Exception as e:
            logger.error(f"Erreur envoi email: {e}")
    
    @staticmethod
    def send_grade_notification(student, course, grade):
        """Notification spécifique pour les notes"""
        return NotificationService.send_notification(
            recipient_id=student.user.id,
            title="Nouvelle note disponible",
            message=f"Votre note pour {course} est disponible: {grade}/20",
            notif_type='resultat',
            priority='high',
            channel='interne',
            action_url='/my-grades',
            action_label='Voir mes notes',
            icon='award',
            color='emerald'
        )
    
    @staticmethod
    def send_absence_alert(student, absence_count):
        """Notification d'alerte d'absence"""
        if absence_count >= 6:
            priority = 'urgent'
            color = 'red'
            message = f"ALERTE: Vous avez {absence_count} absences. Risque d'exclusion!"
        elif absence_count >= 4:
            priority = 'high'
            color = 'orange'
            message = f"Attention: Vous avez {absence_count} absences non justifiées."
        else:
            priority = 'normal'
            color = 'yellow'
            message = f"Vous avez {absence_count} absences. Pensez à les justifier."
        
        return NotificationService.send_notification(
            recipient_id=student.user.id,
            title="Alerte d'assiduité",
            message=message,
            notif_type='absence',
            priority=priority,
            channel='interne',
            action_url='/my-attendance-student',
            action_label='Voir mes absences',
            icon='alert-triangle',
            color=color
        )
    
    @staticmethod
    def send_payment_reminder(student, invoice):
        """Notification de rappel de paiement"""
        return NotificationService.send_notification(
            recipient_id=student.user.id,
            title="Rappel de paiement",
            message=f"Facture #{invoice.number} en attente: {invoice.total_amount}€",
            notif_type='paiement',
            priority='high',
            channel='both',
            action_url='/my-finance',
            action_label='Payer maintenant',
            icon='credit-card',
            color='blue'
        )
    
    @staticmethod
    def send_assignment_notification(student, assignment):
        """Notification de nouveau devoir"""
        return NotificationService.send_notification(
            recipient_id=student.user.id,
            title="Nouveau devoir",
            message=f"Nouveau devoir disponible: {assignment.title}",
            notif_type='cours',
            priority='normal',
            channel='interne',
            action_url=f'/student/courses/{assignment.course_space.id}',
            action_label='Voir le devoir',
            icon='book-open',
            color='blue'
        )
    
    @staticmethod
    def send_bulk_notifications(recipients, title, message, **kwargs):
        """Envoyer des notifications en masse"""
        notifications = []
        for recipient_id in recipients:
            notif = NotificationService.send_notification(
                recipient_id=recipient_id,
                title=title,
                message=message,
                **kwargs
            )
            if notif:
                notifications.append(notif)
        
        logger.info(f"Notifications en masse envoyées: {len(notifications)}")
        return notifications