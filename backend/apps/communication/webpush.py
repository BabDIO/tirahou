"""
Envoi de notifications push web (VAPID) — 8.24 / Q4.

N'utilise aucun service tiers (Firebase, OneSignal...) : le navigateur
relaie lui-même la notification via son propre service de push (FCM/Mozilla
push service en coulisses), TIRAHOU n'a besoin que de sa paire de clés VAPID.
"""
import json
import logging

from django.conf import settings
from pywebpush import webpush, WebPushException

logger = logging.getLogger(__name__)


def send_web_push(user, title, body, url='/notifications', icon=None):
    """
    Envoie une notification push à tous les abonnements actifs de
    l'utilisateur. Best-effort : les abonnements expirés/invalides (410/404)
    sont supprimés silencieusement, les autres erreurs sont journalisées
    sans jamais remonter d'exception à l'appelant.
    """
    from .models import PushSubscription

    subscriptions = PushSubscription.objects.filter(user=user)
    if not subscriptions.exists():
        return 0

    payload = json.dumps({'title': title, 'body': body, 'url': url, 'icon': icon or '/pwa-192x192.png'})
    sent = 0
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    'endpoint': sub.endpoint,
                    'keys': {'p256dh': sub.p256dh, 'auth': sub.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={'sub': f'mailto:{settings.VAPID_CLAIM_EMAIL}'},
            )
            sent += 1
        except WebPushException as exc:
            status_code = getattr(exc.response, 'status_code', None)
            if status_code in (404, 410):
                sub.delete()
            else:
                logger.warning(f"Échec push vers {sub.endpoint[:60]}: {exc}")
        except Exception as exc:
            logger.warning(f"Erreur inattendue push: {exc}")
    return sent
