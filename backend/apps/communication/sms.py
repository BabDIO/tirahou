"""
Envoi de SMS transactionnels — Twilio (8.24 / R3).

Sans `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER` configurés,
`is_configured()` renvoie False et l'appel est journalisé sans jamais lever
d'exception — l'appel API réel (Twilio REST, sans SDK requis) est prêt.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TWILIO_API_URL = 'https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json'


def is_configured():
    return bool(
        getattr(settings, 'TWILIO_ACCOUNT_SID', '')
        and getattr(settings, 'TWILIO_AUTH_TOKEN', '')
        and getattr(settings, 'TWILIO_FROM_NUMBER', '')
    )


def send_sms(to_number, message):
    """Envoie un SMS. Retourne (success: bool, detail: str)."""
    if not is_configured():
        logger.info(f"[SMS non envoyé — Twilio non configuré] à {to_number}: {message[:50]}")
        return False, "Passerelle SMS non configurée (TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER manquants)."

    url = TWILIO_API_URL.format(sid=settings.TWILIO_ACCOUNT_SID)
    try:
        response = requests.post(
            url,
            data={'To': to_number, 'From': settings.TWILIO_FROM_NUMBER, 'Body': message},
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            timeout=10,
        )
        if response.status_code in (200, 201):
            return True, 'Envoyé'
        return False, response.text[:300]
    except requests.RequestException as exc:
        logger.error(f"Erreur envoi SMS Twilio: {exc}")
        return False, str(exc)
