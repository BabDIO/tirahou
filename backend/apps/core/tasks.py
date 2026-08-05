"""
Livraison asynchrone des webhooks sortants (8.29 / R2).
"""
import hashlib
import hmac
import ipaddress
import json
import socket
from urllib.parse import urlparse

import requests
from celery import shared_task
from django.utils import timezone


def _is_safe_webhook_url(url: str) -> bool:
    """
    Rejette les URLs pointant vers le loopback/réseau privé/link-local (ex:
    169.254.169.254, métadonnées cloud) — un compte disposant du module
    'accounts' peut créer un WebhookSubscription avec une URL arbitraire ;
    sans ce contrôle, la requête serveur-à-serveur `requests.post` ci-dessous
    servait de SSRF vers le réseau interne.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname:
            return False
        ip = socket.gethostbyname(parsed.hostname)
        addr = ipaddress.ip_address(ip)
        return not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved or addr.is_multicast)
    except (ValueError, socket.gaierror):
        return False


@shared_task
def deliver_webhook_task(subscription_id, event_type, payload):
    from .models import WebhookSubscription, WebhookDelivery

    try:
        subscription = WebhookSubscription.objects.get(id=subscription_id, is_active=True)
    except WebhookSubscription.DoesNotExist:
        return

    body = json.dumps({'event': event_type, 'data': payload, 'timestamp': timezone.now().isoformat()}, default=str)
    headers = {'Content-Type': 'application/json'}
    if subscription.secret:
        signature = hmac.new(subscription.secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        headers['X-Webhook-Signature'] = signature

    delivery = WebhookDelivery.objects.create(subscription=subscription, event_type=event_type, payload=payload)
    if not _is_safe_webhook_url(subscription.url):
        delivery.error_message = "URL refusée (cible interne/privée non autorisée)."
        delivery.save()
        return
    try:
        response = requests.post(subscription.url, data=body, headers=headers, timeout=5, allow_redirects=False)
        delivery.status_code = response.status_code
        delivery.success = response.ok
        delivery.delivered_at = timezone.now()
    except requests.RequestException as exc:
        delivery.error_message = str(exc)[:500]
    delivery.save()


def dispatch_webhook(event_type, payload):
    """
    Point d'entrée à appeler depuis le code métier (best-effort — ne doit
    jamais faire échouer l'action qui déclenche l'événement).
    """
    from .models import WebhookSubscription

    try:
        subscription_ids = list(
            WebhookSubscription.objects.filter(event_type=event_type, is_active=True).values_list('id', flat=True)
        )
        for subscription_id in subscription_ids:
            deliver_webhook_task.delay(str(subscription_id), event_type, payload)
    except Exception:
        pass
