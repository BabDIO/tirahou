"""
Livraison asynchrone des webhooks sortants (8.29 / R2).
"""
import hashlib
import hmac
import json

import requests
from celery import shared_task
from django.utils import timezone


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
    try:
        response = requests.post(subscription.url, data=body, headers=headers, timeout=5)
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
