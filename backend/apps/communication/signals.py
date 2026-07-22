"""
Diffusion temps réel des notifications sur WebSocket.

Un post_save sur Notification (plutôt qu'un hook dans NotificationService)
pour couvrir uniformément tous les points de création existants dans le
code (services, tâches Celery, signaux d'autres apps) sans devoir modifier
chacun d'eux individuellement.
"""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Notification

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Notification)
def push_notification_realtime(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        from .serializers import NotificationSerializer
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(
            f'user_{instance.recipient_id}',
            {'type': 'notification.message', 'data': NotificationSerializer(instance).data},
        )
    except Exception as e:
        # Best-effort : l'utilisateur verra quand même la notification au
        # prochain chargement de /notifications, même si le push échoue.
        logger.warning(f"Push WebSocket non envoyé: {e}")
